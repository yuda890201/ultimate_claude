# ai-dev — AIアプリ開発環境の共通基盤

このディレクトリは、株式会社ゆだや の AIアプリ開発環境における
**共通ルール・テンプレート・スキル・スクリプトの「正本」**です。

Gemini も Claude も、どの環境から作業する場合も、ここを基準とします。

---

## なぜ GitHub に置いているのか

開発ルールを「Cloud Shell の `~/ai-dev/` だけ」に置くと、次の問題が起きます。

- Claude Code のリモート環境（claude.ai から起動する使い捨てコンテナ）からは**見えない・書いても消える**
- iPhone から作業するとき、どのルールが最新か分からなくなる
- 環境を作り直すとルールごと消える

そこで、**「GitHubを唯一の正本とする」という開発方針をルール自身にも適用**し、
このリポジトリをルールの正本としています。

---

## ディレクトリ構成

```
ai-dev/
├── README.md                    ← このファイル
├── rules/
│   └── DEVELOPMENT_RULES.md     ← 共通開発ルール（全AI共通・最重要）
├── templates/                   ← 各アプリに配置するMDのひな形
│   ├── GEMINI.md
│   └── CLAUDE.md
├── prompts/                     ← 新アプリ立ち上げ用プロンプト（STEP 3で作成予定）
├── skills/                      ← AI用スキル（STEP 6で必要なものだけ作成）
└── scripts/                     ← 安全装置スクリプト（STEP 6で必要なものだけ作成）
```

---

## Cloud Shell でのセットアップ

Cloud Shell 側では、このリポジトリを clone して `~/ai-dev` として使います。

### 初回のみ

```bash
# 1. 作業用ディレクトリを作る
mkdir -p ~/ai-dev

# 2. 共通基盤リポジトリを clone
cd ~
git clone https://github.com/yuda890201/ultimate_claude ~/ai-dev-repo

# 3. 共通ルール類をシンボリックリンクで参照する
ln -sfn ~/ai-dev-repo/ai-dev/rules     ~/ai-dev/rules
ln -sfn ~/ai-dev-repo/ai-dev/templates ~/ai-dev/templates
ln -sfn ~/ai-dev-repo/ai-dev/prompts   ~/ai-dev/prompts
ln -sfn ~/ai-dev-repo/ai-dev/skills    ~/ai-dev/skills
ln -sfn ~/ai-dev-repo/ai-dev/scripts   ~/ai-dev/scripts

# 4. アプリを置く場所を作る
mkdir -p ~/ai-dev/projects ~/ai-dev/logs ~/ai-dev/config
```

> シンボリックリンクを使う理由: `~/ai-dev/projects/` には各アプリのリポジトリが入るため、
> `~/ai-dev` 自体をリポジトリにすると Git が入れ子になって混乱します。
> ルール類だけをリンクすることで、`git pull` 1回で全AIのルールが最新になります。

### ルールを最新にする

```bash
cd ~/ai-dev-repo && git pull origin main
```

これだけで `~/ai-dev/rules/` `~/ai-dev/templates/` が最新になります。

---

## 各AIが最初に読むもの

| 状況 | 読むファイル |
|---|---|
| どの環境・どのアプリでも共通 | `ai-dev/rules/DEVELOPMENT_RULES.md` |
| 個別アプリの作業時（Gemini） | そのアプリの `GEMINI.md` |
| 個別アプリの作業時（Claude） | そのアプリの `CLAUDE.md` |

各アプリの `GEMINI.md` / `CLAUDE.md` には**ルール本文をコピーしません。**
共通ルールへの参照と、そのアプリ固有の情報だけを書きます。

---

## テンプレートの使い方（新アプリ・既存アプリ共通）

`ai-dev/templates/GEMINI.md` と `ai-dev/templates/CLAUDE.md` は、
各アプリのリポジトリ直下にコピーして使う**ひな形**です。

### 新規アプリの場合

```bash
cp ~/ai-dev/templates/GEMINI.md ~/ai-dev/projects/<アプリ名>/GEMINI.md
cp ~/ai-dev/templates/CLAUDE.md ~/ai-dev/projects/<アプリ名>/CLAUDE.md
```

コピー後、「2. このプロジェクト固有の情報」欄を埋めてから commit してください。

### 既存アプリに適用する場合（重要）

**既に `CLAUDE.md` / `GEMINI.md` がある場合、丸ごと上書きしないでください。**

1. 既存ファイルの内容を読む
2. テンプレートをコピーする
3. 既存ファイルに書かれていた固有情報（ブランドルール・UI方針・データ方針など）を
   「2. このプロジェクト固有の情報」欄に**移す**
4. 内容に抜け漏れがないか見比べる
5. 置き換えて commit する

このステップを飛ばすと、既存の重要なルール（例: ブランド表記の禁止事項など）が
消えてしまいます（共通ルール第12章参照）。

### 適用状況（このリポジトリ群での展開）

現時点でテンプレートを適用したアプリは**まだありません**。
STEP 4（実アプリでのテスト）で、影響の小さいアプリ1〜2個に試験適用してから、
問題がなければ他のアプリへ展開します。21アプリへの一括適用はしません。

---

## 関連

- `gcp-devops-setup-mcp/` — Cloud Run + GitHub のセットアップを自動化する MCP サーバー
