# 枠の隔離とCSPを、意味のある形で検証する

どちらも**ブラウザが解釈して初めて効く**ものである。ヘッダが載っている
かを確かめるだけでは、効いているかは分からない。

## 他サイトの枠に入れられないこと（クリックジャッキング）

認証情報を入力する画面が枠に入れられると、攻撃者の見せかけの文言の下に
本物の入力欄と本物のボタンを重ねられる。利用者は本物の値を本物の欄に
入れ、本物のボタンを押す。

### 間違ったやり方

```python
# 枠の中の contentDocument が見えないことを確認する
#   → 別オリジンの枠は、対策ヘッダの有無に関係なく null になる。
#     ヘッダを外してもテストは通る。何も検証していない。
```

**最初にこう書いて、ヘッダを外しても通ることに気づいて作り直した。**

### 正しいやり方

ブラウザが出す拒否メッセージを見る。

```python
page = browser.new_page()
messages = []
page.on("console", lambda m: messages.append(m.text))
page.set_content(f'<iframe src="{target_url}" width="400" height="800"></iframe>')
page.wait_for_timeout(1500)
refusal = [m for m in messages if m.startswith("Refused to ")]
assert refusal, f"枠に入ってしまっている: {messages}"
```

`X-Frame-Options` と CSP の `frame-ancestors` を両方送っている場合、
**出るのは CSP のメッセージである**（CSP が優先される）。

```
Refused to frame 'http://...' because an ancestor violates the following
Content Security Policy directive: "frame-ancestors 'self'".
```

ヘッダを外して走らせると、代わりに**枠の中のページが読み込まれた証拠**
が出る（例: `[DOM] Password field is not contained in a form`）。
両方を見分けられていることを、必ず一度確認する。

## 枠の中から親に触れないこと

同一オリジンで iframe を読み込むと、**枠の中のJSから
`parent.document` 経由で親の入力欄が読める。** 中身を自分で生成して
いても、同じオリジンに認証情報の入力欄がある画面に、隔離していない枠を
置く理由は無い。

`sandbox="allow-scripts"` を付ける（`allow-same-origin` は**含めない**。
含めると不透明オリジンにならず、隔離されない）。

```python
result = page.frame_locator("#preview").locator("body").evaluate(
    """() => {
      try {
        const el = window.parent.document.getElementById('pin');
        return el ? 'REACHABLE' : 'parent-reachable-no-field';
      } catch (e) { return 'blocked:' + e.name; }
    }"""
)
assert result.startswith("blocked:"), f"親に届いている: {result}"
```

このテストを `sandbox` 無しで走らせて `REACHABLE` が返ることを確認して
おく。**実際に届いていた。**

## CSP で壊れるものを見落とさない

`script-src 'self'` を一律に課すと、**外部から読んでいたものが全部
止まる。** それが意図どおりの場所と、そうでない場所がある。

止めてはいけない例: 公開されるページの見た目を再現するプレビュー。
ここを止めると無装飾になり、「人間が見たものと公開物が一致する」と
いう前提が崩れる。

**経路ごとに分ける。** そして分けた理由をコードに書く（後から
「なぜここだけ緩いのか」が分からなくなる）。

検証は、コンソールに `Refused to load` が出ていないことで見る。
出ていたら、意図した経路かどうかを判断する。

```python
errs = []
page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
```
