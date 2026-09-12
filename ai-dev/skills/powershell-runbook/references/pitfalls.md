# Windows PowerShell 5.1 の罠

実際に踏んだものだけ。PowerShell 7 とも bash とも挙動が違う。

## `$ErrorActionPreference = "Stop"` はネイティブコマンドに効かない

**これが最も危険。** `Stop` を設定しても、`git` や `gcloud` のような
外部実行ファイルの失敗では止まらない。次の行がそのまま動く。

```powershell
$ErrorActionPreference = "Stop"
git pull origin main        # 失敗しても止まらない
gcloud run deploy ...       # 古いコードがデプロイされる
Write-Host "OK"             # 表示される
```

ネイティブコマンドの後は毎回 `$LASTEXITCODE` を見る。

```powershell
git pull origin main
if ($LASTEXITCODE -ne 0) { Write-Host "NG: pull failed"; exit 1 }
```

`try/catch` も効かない（例外が投げられないため）。

## カンマを含む引数は配列として解釈される

```powershell
# 悪い: "A=1","B=2" の配列になり、gcloud に壊れた文字列が渡る
gcloud run services update $svc --update-env-vars A=1,B=2

# よい
gcloud run services update $svc --update-env-vars "A=1,B=2"
```

引用符が不均衡だと、PowerShell は入力継続と判断して `>>` を出したまま
止まる。利用者からは「固まった」に見える。**Ctrl+C で抜けられる**ことを
添えておく。

## `Invoke-WebRequest` / `Invoke-RestMethod`

- `-Accept` というパラメータは**無い**。ヘッダは `-Headers` で渡す

  ```powershell
  Invoke-RestMethod -Uri $u -Headers @{ Accept = "application/json" }
  ```

- 4xx/5xx は例外になる。本文が欲しいなら自分で読む

  ```powershell
  try { $r = Invoke-RestMethod -Uri $u -Method POST -Body $b -ContentType "application/json" }
  catch {
    $code = "unknown"
    if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ }
    $detail = $null
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $detail = $reader.ReadToEnd()
    } catch { }
    Write-Host "NG: HTTP $code $detail"
    exit 1
  }
  ```

- 細かい制御が要るとき（任意メソッド、ヘッダの確認）は
  `System.Net.HttpWebRequest` を直に使うほうが確実

## 文字コード

コンソールの既定が CP932 のため、UTF-8 のリテラルが化ける。
スクリプト内の**リテラルは ASCII に限定する**のが最も確実。
出力の記号も `[OK]` / `[NG]` のような ASCII にする。

ファイルを読み書きするときは明示する。

```powershell
Get-Content $p -Encoding UTF8
Set-Content $p -Encoding UTF8
```

## `.ps1` はファイル名だけでは実行できない

実行ポリシーで止まる。手順には毎回この形で書く。

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

カレントディレクトリのスクリプトも `.\deploy.ps1` と書く必要がある
（`deploy.ps1` だけでは PATH を探しに行く）。

## `Get-Clipboard` を手順に入れない

クリップボードは利用者が別のものをコピーした瞬間に壊れる。実際に、
コピーしておいたURLが別の値で上書きされた。値は画面に出させて、
**変数への代入として貼ってもらう。**

## `Out-String` と `.Trim()`

`gcloud` の出力は末尾に改行が付く。比較や長さを見る前に必ず落とす。

```powershell
$url = (gcloud run services describe $svc --format="value(status.url)" | Out-String).Trim()
```

落とさないと、長さが1多く出て「32文字のはずが33文字」と混乱する。
