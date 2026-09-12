---
name: mobile-ui-selfcheck
description: スマホで使うWeb画面を作る・直すときに使う。実機が手元に無い状態でレイアウト崩れ・横スクロール・枠の隔離・CSPによる読み込み拒否を自分で確かめる方法。「スマホで見たら崩れていた」「実機でしか出ない」を減らすために読む。Use when building or fixing a web UI meant for phones without a real device - checking narrow-viewport overflow, horizontal scroll, iframe isolation, and CSP refusals with a headless browser.
---

# 実機のスマホなしでモバイルWeb UIを検証する

実機でしか見つからないと思われている不具合の多くは、**ヘッドレス
ブラウザで再現できる。** 実際にこの方法で、実機でしか出ていなかった
崩れ3件（flex の方向、長い値の折り返し、入力欄の幅）を捕まえた。

Chromium + Playwright があれば動く。

## 4つの手順

### 0. 測る前に、画面が本当に描画されたか確かめる

**引数や状態が必要な画面を素で叩くと、エラー応答が返る。** 中身が無いので
何をしても崩れず、**全部通る。** 実際にこれを踏んだ（認可画面を引数なしで
叩き、JSONのエラーを測っていた）。

目印となる要素（`h1`、`form` など）が1つも無ければ失敗させる。
`scripts/harness.py` の `REQUIRE` がそれで、返ってきた内容も出す。

```
AssertionError: /oauth/authorize が描画されていない（REQUIRE=... に一致する要素が0）。
  返ってきた内容: '{"error": "invalid_client", ...}'
```

### 1. 狭い画面で「はみ出している要素」を列挙する

幅だけ変えて3回見る。**320 / 390 / 430px。** 320 は現行機で最も狭い。

`scripts/overflow_probe.js` を `page.evaluate()` に渡すと、
はみ出している要素の一覧が返る。`scripts/harness.py` がその形の雛形。

```
AssertionError: 523 not less than or equal to 390 :
  {'cw': 390, 'sw': 523, 'bad': ['DIV#', 'INPUT#pin', 'BUTTON#btn-allow']}
```

`scrollWidth > clientWidth` だけでは足りない。`overflow-x: hidden` を
指定していると**値が切り取られて一致してしまう**ので、要素ごとに
`getBoundingClientRect()` を見る必要がある。

### 2. CDN が落ちた状態を既定として検証する

**実機の崩れ3件はすべてこれが原因だった。** CSS フレームワークを CDN
から読んでいると、届かない状況（遮断・障害・読み込み前の一瞬）で
ユーティリティクラスが全部無効になる。

特に危ないのは、**JSが `style.display = "flex"` を直に入れておきながら、
方向をクラス（`flex-col`）に任せている**形。クラスが無効になると
画面全体が横1列になり、数百px はみ出す。

外枠・方向・折り返し・入力欄の幅は、フレームワークに依存しない CSS
側に持たせる。

**この2モードの差は実測してある。** 同じ画面で、方向を持つCSS1行を
消した状態を測った。

| モード | 結果 |
|---|---|
| フレームワークが読める | `sw=390 cw=390 bad=0` → **通ってしまう** |
| フレームワークを止めた | `sw=583 cw=390 bad=1` → **捕まえる** |

通常モードだけを持っていると、フレームワークが穴を埋めるので
**通るだけで何も検証しないテストになる。**

```css
/* JS が display:flex を入れる要素の方向は自分で持つ */
.shell > div { flex-direction: column; }
/* 長い値（URL・ID・相手が決めた文字列）は必ず折り返す */
.shell, .shell * { min-width: 0; overflow-wrap: anywhere; }
.shell input { width: 100%; }
```

### 3. スクリーンショットを撮って、自分の目で見る

判定を全部コードに書けるとは限らない。**撮って見る。**
セキュリティヘッダを一律に課してプレビューが無装飾になったことに、
これで気づいた（テストは全部通っていた）。

```python
page.screenshot(path="out/approve.png")
```

あわせてコンソールのエラーを集める。CSP 違反や読み込み失敗は
ここに出る。

```python
errs = []
page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
```

### 4. 枠の隔離はブラウザの拒否メッセージで判定する

認証情報を入力する画面が他サイトの枠に入れられないこと、枠の中から
親に触れないこと。**やり方を間違えると何も検証しないテストになる。**

詳細は `references/checks.md`。

## 検証したことにしない

この方法で確かめられないものがある。報告では区別する。

- 実機のブラウザ固有の挙動（Safari の safe-area、PWA としての起動）
- タッチの当たり判定、スクロールの慣性
- プッシュ通知の実配信
- 実際のフォント（環境に無いフォントは代替に置き換わる）

**「ヘッドレスでは崩れなかった」は「実機で崩れない」ことの証明では
ない。** ただし、ヘッドレスで崩れるものは実機でも崩れる。
先に潰せるものを先に潰す、という位置づけで使う。
