"""狭い画面での崩れを見る雛形。標準の unittest で動く。

使い方:
  1. LAUNCH / READY_URL / PAGES を自分のプロジェクトに合わせる
  2. `python -m unittest <このファイルのモジュール名>` で走らせる

前提: Chromium と playwright。無ければスキップする（**スキップ件数は
必ず読む。** 依存が無いせいで丸ごとスキップされているのを「通った」と
読む事故が起きる）。
"""

import glob
import os
import pathlib
import socket
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except Exception:  # noqa: BLE001
    HAS_PLAYWRIGHT = False

SKIP_REASON = "playwright が未インストール（pip install playwright）"

HERE = pathlib.Path(__file__).resolve().parent
PROBE = (HERE / "overflow_probe.js").read_text(encoding="utf-8")

# ---- ここを自分のプロジェクトに合わせる ------------------------------
LAUNCH = [sys.executable, "server.py"]   # サーバの起動コマンド
CWD = pathlib.Path.cwd()                 # その作業ディレクトリ
READY_PATH = "/"                         # 起動完了の判定に叩くパス
# 検証するパス。**引数や状態が必要な画面は、それを用意した URL にする。**
# 用意せずに叩くとエラー応答が返り、ハーネスは画面ではなくエラーページを
# 測る。中身が無いので何をしても崩れず、**全部通る。**（実際に踏んだ）
PAGES = ["/"]
# 各ページで「描画された」と判断する目印。ここに挙げたものが1つも
# 見つからなければ失敗させる。これが無いと上の事故に気づけない。
REQUIRE = "h1, h2, form, main, [data-ready]"
WIDTHS = (320, 390, 430)                 # 320 は現行機で最も狭い
SHELL = "body"                           # 走査対象のセレクタ

# **読み込みを止めるもの。** CSSフレームワークを CDN から読んでいると、
# 届かない状況（遮断・障害・読み込み前の一瞬）でユーティリティクラスが
# 全部無効になる。実機の崩れはここが原因だった。
# 止めた状態と止めない状態の**両方**で走らせる。片方だけだと、
# フレームワークが穴を埋めてしまい、崩れを検出できない。
BLOCK = ["**/tailwind*.css", "**/*.min.css", "https://cdn.*/**", "https://cdnjs.*/**"]
# ----------------------------------------------------------------------


def chromium_path():
    """Playwright が入れた Chromium を探す。環境変数が指す場所も見る。"""
    base = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
    roots = [base] if base else []
    roots += [str(pathlib.Path.home() / ".cache" / "ms-playwright")]
    for root in roots:
        for pattern in ("chromium*/chrome-linux/chrome", "chromium", "chrome-win/chrome.exe"):
            hits = glob.glob(str(pathlib.Path(root) / pattern))
            if hits:
                return hits[0]
    return None


@unittest.skipUnless(HAS_PLAYWRIGHT, SKIP_REASON)
class ItFitsANarrowPhone(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.chromium = chromium_path()
        if cls.chromium is None:
            raise unittest.SkipTest("Chromium が見つからない")

        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        cls.port = sock.getsockname()[1]
        sock.close()
        cls.proc = subprocess.Popen(
            LAUNCH, cwd=str(CWD), env=dict(os.environ, PORT=str(cls.port)),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        cls.base = f"http://127.0.0.1:{cls.port}"
        for _ in range(100):
            try:
                urllib.request.urlopen(cls.base + READY_PATH, timeout=1)
                break
            except urllib.error.HTTPError:
                break          # 4xx でも「応答している」ので起動済み
            except Exception:  # noqa: BLE001
                time.sleep(0.1)
        else:
            raise RuntimeError("サーバーが起動しなかった")

        cls._pw = sync_playwright().start()
        cls.browser = cls._pw.chromium.launch(executable_path=cls.chromium)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls._pw.stop()
        cls.proc.terminate()
        cls.proc.wait(timeout=10)

    def check(self, path, width, *, block):
        page = self.browser.new_page(viewport={"width": width, "height": 844})
        errors = []
        page.on(
            "console",
            lambda m: errors.append(m.text) if m.type == "error" else None,
        )
        try:
            if block:
                for pattern in BLOCK:
                    page.route(pattern, lambda route: route.abort())
            page.goto(self.base + path, wait_until="load")
            page.wait_for_timeout(400)
            # **測る前に、画面が本当に描画されたかを確かめる。**
            # エラー応答を測っていると、中身が無いので何をしても崩れず、
            # 通るだけで何も検証しないテストになる。
            rendered = page.evaluate(
                "(sel) => document.querySelectorAll(sel).length", REQUIRE
            )
            if rendered == 0:
                body = page.evaluate("() => document.body.innerText.slice(0, 200)")
                raise AssertionError(
                    f"{path} が描画されていない（REQUIRE={REQUIRE!r} に一致する要素が0）。"
                    f"引数や状態が必要な画面かもしれない。返ってきた内容: {body!r}"
                )
            info = page.evaluate(PROBE, SHELL)
            # 撮っておく。判定を全部コードに書けるとは限らない。
            out = pathlib.Path("out")
            out.mkdir(exist_ok=True)
            name = (path.strip("/") or "index").replace("/", "_")
            suffix = "-nocss" if block else ""
            page.screenshot(path=str(out / f"{name}-{width}{suffix}.png"))
            return info, errors
        finally:
            page.close()

    def test_no_element_overflows_sideways(self):
        """フレームワークが読めた状態で、横にはみ出さないこと。"""
        for path in PAGES:
            for width in WIDTHS:
                with self.subTest(path=path, width=width):
                    info, errors = self.check(path, width, block=False)
                    self.assertEqual(info["bad"], [], info)
                    self.assertLessEqual(info["sw"], info["cw"], info)
                    refused = [e for e in errors if "Refused to" in e]
                    self.assertEqual(refused, [], f"読み込みが拒否された: {refused}")

    def test_it_still_fits_when_the_css_framework_does_not_load(self):
        """**フレームワークが読めない状態でも横にはみ出さないこと。**

        実機でしか出ていなかった崩れ3件は、すべてこれが原因だった。
        特に、JSが `style.display = "flex"` を直に入れておきながら方向を
        クラス（`flex-col`）に任せていると、画面全体が横1列になる。

        この検証を入れずに上のテストだけを持っていると、フレームワークが
        穴を埋めてしまい、**通るだけで何も検証しないテストになる。**
        """
        for path in PAGES:
            for width in WIDTHS:
                with self.subTest(path=path, width=width):
                    info, _ = self.check(path, width, block=True)
                    self.assertEqual(info["bad"], [], info)
                    self.assertLessEqual(info["sw"], info["cw"], info)


if __name__ == "__main__":
    unittest.main(verbosity=2)
