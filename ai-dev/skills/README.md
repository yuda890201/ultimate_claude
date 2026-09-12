# skills — AI用スキルの正本

Claude Code のスキルを置く場所です。ここが**正本**であり、各プロジェクトへは
コピーまたはシンボリックリンクで配置します。

## スキルとは何か

1つのディレクトリに `SKILL.md` を置いたものです。

```
<スキル名>/
  SKILL.md          ← 本体。YAML frontmatter + Markdown
  references/*.md   ← 長い資料（必要になったときだけ読まれる）
  scripts/*         ← 実行できる部品（任意）
```

`SKILL.md` の先頭:

```yaml
---
name: <ディレクトリ名と同じ>
description: どんなときに使うかを書く。**これが自動発動の条件になる**
---
```

`description` が判定に使われます。ここが曖昧だと、必要なときに発動せず、
不要なときに発動します。日本語と英語のキーワードを両方入れておくと、
どちらで指示されても拾えます。

`/スキル名` と打てば明示的にも呼べます。

## 置いてあるもの

| スキル | 何のため |
|---|---|
| `verify-that-can-fail` | 検証・診断・確認スクリプトを書くとき。「通ったらOK」の判定が本当に機能しているかを確かめる規律 |
| `powershell-runbook` | 人間に実行させる手順やスクリプトを書くとき（Windows PowerShell 5.1 前提） |
| `mcp-server-pitfalls` | MCPサーバを実装するとき。Gemini アプリに繋ぐ場合の要件を含む |
| `mobile-ui-selfcheck` | 実機のスマホなしでモバイルWeb UIを検証するとき |

## 各プロジェクトで有効にする

Claude Code が自動で読むのは、作業しているリポジトリの
`.claude/skills/` だけです。**`ai-dev/skills/` に置いただけでは発動しません。**

### Cloud Shell / Linux（シンボリックリンク）

正本を1つに保てるのでこちらが望ましい形です。

```bash
mkdir -p <プロジェクト>/.claude
ln -sfn ~/ai-dev-repo/ai-dev/skills <プロジェクト>/.claude/skills
```

### Windows（コピー）

Git for Windows は既定でシンボリックリンクを展開しないため、コピーします。
**コピーは複製なので、正本を更新したら配り直す必要があります。**

```powershell
$src = "$HOME\ai-dev-repo\ai-dev\skills"
$dst = "<プロジェクト>\.claude\skills"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -Recurse -Force $src $dst
```

### リモートの Claude Code（claude.ai から起動する使い捨てコンテナ）

コンテナは毎回作り直されるため、`~/.claude/skills/` に置いても消えます。
**リポジトリにコミットされたものだけが残ります。** そのため、
プロジェクト側の `.claude/skills/` に入った状態でコミットされている必要が
あります。

## 追加・変更するとき

- `description` は「どんなときに使うか」を具体的に書く。カテゴリ名だけでは
  発動しません
- 本文は読み物ではなく**手順**にする。長い背景は `references/` へ分ける
- 壊れた `SKILL.md` はエラーにならず、**黙って発動しなくなるだけ**です。
  名前とディレクトリ名の一致、`description` の有無、案内先ファイルの実在を
  必ず確認してください
