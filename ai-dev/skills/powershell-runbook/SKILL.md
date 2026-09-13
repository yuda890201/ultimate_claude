---
name: powershell-runbook
description: 人間に実行してもらうコマンドや手順書、セットアップ/デプロイ用の .ps1 を書くときに使う。Windows PowerShell 5.1 が前提。コマンドを提示して結果を貼ってもらう往復が発生する作業（クラウドの設定、シークレット登録、デプロイ、疎通確認）で読む。Use when writing commands, runbooks, or PowerShell scripts for a human to run on Windows, especially cloud setup, secret registration, deployment, or connectivity checks where they paste the output back.
---

# 人間に実行させる手順の書き方（PowerShell 5.1）

手順は**成果物**である。「コマンドは正しかったが利用者が間違えた」は、
ほぼ全部手順側の欠陥である。1往復に数分かかるので、**往復の回数が
そのまま開発速度になる。**

以下は実際に踏んだ8件から作った規則である
（`references/pitfalls.md` に PowerShell 5.1 固有の罠）。

## 5つの規則

### 0. どのシェルで実行するのか、ブロックごとに書く

環境が2つ以上あると（PCの PowerShell と Cloud Shell の bash など）、
**利用者は貼る前に毎回迷う。** 実際に何度も聞かれた。聞かせている時点で
手順側の欠陥である。

コードブロックの言語指定（```powershell / ```bash）だけでは足りない。
**どこで実行するのかを日本語で1行添える。**

    次を **PC の PowerShell** で実行してください（Cloud Shell では動きません）

    ```powershell
    ...
    ```

見分け方も伝えておくと、こちらが書き漏らしたときに気づいてもらえる。

| これが出てきたら | そのシェル |
|---|---|
| `$変数`・`Invoke-WebRequest`・`Join-Path`・`[System.～]`・行末の `` ` `` | PowerShell |
| `export`・`curl`・`$(...)`・`~/`・`./xxx.sh`・行末の `\` | bash |

`gcloud` と `git` はどちらでも動く。**判断材料は周りの書き方である。**

あわせて、そのコマンドが**何に触るか**を書く。触らないことを書くほうが
効く（「リポジトリには書きません」「git も gcloud も触りません」
「取り消す必要のあるものは残りません」）。破壊的でないと分かれば、
利用者は確認のための往復をしなくて済む。

### 1. 1回で貼れる形にする。手で組ませない

値を埋めさせる、複数行を継ぎ足させる、クリップボードを経由させる —
どれも失敗した。

```powershell
# 悪い: 名前と値を手で入れ替えられる。引用符が崩れると >> でプロンプトが止まる
gcloud run services update SERVICE --update-env-vars KEY=VALUE

# よい: 値は変数にして上で1回だけ書く。カンマを含むならダブルクォートで囲む
$svc = "app-studio"
$vars = "KEY_A=aaa,KEY_B=bbb"
gcloud run services update $svc --update-env-vars "$vars"
```

**プレースホルダを含む手順を出さない。** `<申請の結果に出たID>` のような
記法は、そのまま貼り付けられる。値が必要なら、その値を取ってくる
コマンドごと渡す。

```powershell
# よい: ID を取る行と、使う行を続けて1ブロックで渡す
$id = (Invoke-RestMethod -Uri "$url/api/approvals/current" -Method GET).approval_id
Invoke-RestMethod -Uri "$url/api/approvals/$id" -Method GET
```

### 2. 実行後に「何が確認できたか」を出す

貼り戻してもらう出力が、そのまま検証結果になるようにする。
長さ・一致・HTTPコード・コミットのような**判定できる値**を出す。

```powershell
# 悪い: 成功したのか分からない
gcloud secrets versions add admin-pin --data-file=-

# よい: 登録した値が空でないことを、その場で確かめる
$len = (gcloud secrets versions access latest --secret=admin-pin | Out-String).Trim().Length
if ($len -lt 16) { Write-Host "NG: $len 文字しか入っていない" -ForegroundColor Red }
else             { Write-Host "OK: $len 文字" -ForegroundColor Green }
```

**貼り付け直後に長さを出す。** シークレットに空白だけが入っていた事故と、
トークンが2文字しか貼れていなかった事故は、どちらもこれで即分かる。

### 3. 秘密情報は値ではなく長さと形を出す

チャットに値を貼らせない。貼らせると履歴に残る。

```powershell
Write-Host ("token: " + $t.Length + " chars, starts with " + $t.Substring(0,4))
```

スクリプト内で使い終えたら `$pin = $null` で落とす。

### 4. 一度しか出ない情報には、戻る手段を添える

一度だけ表示されるURL・ID・PINは、必ず失われる。通知は消える。
タブは閉じる。**「もう一度出す方法」を同じメッセージに書く。**

```
承認URL: https://.../approve?t=xxxx
（閉じてしまったら https://.../approve を開くと承認待ちの一覧が出ます）
```

## スクリプトを渡すときの形

- 実行の仕方を毎回添える。ファイル名だけでは実行できない

  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
  ```

- **失敗したら必ず非ゼロで終わる。** 途中の失敗を握り潰さない
- 段階に番号を振り、`Step 3 "..."` のように何をしているか出す
- リテラルは ASCII に限定する（コンソールの文字コードで化ける）
- **外部コマンドは PATH で見つからなくても諦めない。** 標準の
  インストール先も見る。PATH を手で足させる手順は手順側の欠陥である
  （`python` は Store のスタブに隠される。`references/pitfalls.md`）
- 手順の自己申告を根拠にしない。**確認の主体を、確認される側に移す**
  （デプロイ後に「デプロイした」と言うのではなく、稼働中のサービスに
  「どのコミットで動いているか」を聞く）

`references/template.ps1` に、この形の雛形がある。

## 必ず読むもの

`references/pitfalls.md` — PowerShell 5.1 は他のシェルと違う挙動をする。
**特に `$ErrorActionPreference="Stop"` はネイティブコマンドの失敗を
捕まえない。** これを知らずに書いたスクリプトが、`git pull` の失敗を
無視して古いコードをデプロイし、しかも成功と表示した。
