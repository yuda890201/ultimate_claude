# ai-dev — AIアプリ開発環境の共通基盤

このディレクトリは、AIアプリ開発環境における
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
│   ├── DEVELOPMENT_RULES.md     ← 共通開発ルール（全AI共通・最重要）
│   └── MOBILE_SETUP.md         ← スマホ+Cloud Shellでの環境セットアップガイド
├── templates/                   ← 各アプリに配置するMDのひな形
│   ├── GEMINI.md
│   └── CLAUDE.md
├── prompts/
│   ├── NEW_APP_LAUNCH_PROMPT.md ← 新アプリ立ち上げ用プロンプト（Gemに渡すコピー用テンプレート）
│   ├── GEMINI_STANDING_INSTRUCTIONS.md ← Gem/Gemini Sparkの永続指示欄に貼る固定ルール
│   └── GEM_SETUP_GUIDE.md       ← 開発用Gemの作成手順(名前/指示/知識/会話のきっかけ)
├── skills/
│   └── project-open/SKILL.md    ← 既存アプリでの作業開始/終了の手順
└── scripts/
    ├── check-handoff.sh         ← 未コミット/未push/未マージブランチの検出
    ├── check-gcp-project.sh     ← GCPプロジェクトの取り違え検出
    └── bashrc-snippet.sh        ← Cloud Shellの ~/.bashrc に追記する自動セットアップ
```

---

## Cloud Shell でのセットアップ

Cloud Shell 側では、このリポジトリを clone して `~/ai-dev` として使います。

> **スマホから使う場合は、この節を手で毎回実行する代わりに
> [`ai-dev/rules/MOBILE_SETUP.md`](rules/MOBILE_SETUP.md) の手順（1回だけの設定で
> 以後は自動化される）を使うことをおすすめします。**
> 以下は、その自動化が内部で行っている内容の説明です。

### 初回のみ（手動で行う場合）

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

## 新アプリを立ち上げるとき

`ai-dev/prompts/NEW_APP_LAUNCH_PROMPT.md` に、新規アプリ立ち上げ用の
コピー用プロンプトがあります。プロジェクトオーナーがGemでアプリの構想を固めた後、
このプロンプトのプレースホルダーを埋めてAIに渡すと、

- 共通開発ルールを継承し
- GEMINI.md / CLAUDE.md を自動生成・配置し
- `~/ai-dev/projects/` 配下に正しく配置し
- GitHubを正本として初期pushする

という STEP 4 で確認予定の一連の流れが実行されます。

---

## Geminiに常に守らせたいルールがあるとき

新アプリ立ち上げ以外の、日常的な作業（既存アプリの修正・スクリプト生成等）で
Geminiに毎回同じルールを守らせたい場合は、
`ai-dev/prompts/GEMINI_STANDING_INSTRUCTIONS.md` を使ってください。

Gem（Geminiの「指示」を保存できる機能）の指示欄に貼り付ければ、以後の会話に
自動で適用されます。そのような永続設定欄が無いGemini製品を使っている場合は、
会話の最初に毎回貼り付けてください。

開発専用のGemをゼロから作る場合は、`ai-dev/prompts/GEM_SETUP_GUIDE.md` に
名前・指示・知識ファイル・会話のきっかけまでを含めた設定案があります。

---

## Skills / Scripts の設計方針（STEP 6）

STEP 1〜5を通じて実際に問題になったのは、突き詰めると次の1点でした。

> **「commitしたら必ずpushする」というルールが守られなければ、
> 次のAIには前の作業が一切見えない（STEP 5で実証済み・第3-3章）。**

これを踏まえ、「AIに守ってもらうルール（MDで指示）」と
「AIが間違えてもプログラム側で機械的に検出できるもの（Script）」を
分けて考え、**最小限だけ**実装しました。今後、実際の運用で困った場面が
増えたら、都度追加します。最初から大量には作りません。

| 分類 | 該当するもの | 理由 |
|---|---|---|
| **MDで指示すれば十分** | 役割分担、秘密情報の扱い、破壊的操作の確認、commitメッセージの書き方 等 | その場の状況判断や意味理解が必要で、機械的に検出できない。AIの理解に委ねるほかない |
| **Scriptで強制すべき** | `check-handoff.sh`（未コミット/未push/未マージブランチの検出）、`check-gcp-project.sh`（GCPプロジェクトIDの一致確認） | 文字列比較・差分検出という**機械的に判定できる**チェックであり、AIの「確認したつもり」による見落としを防げる |
| **Skillが適切** | `project-open`（共通ルール参照 → 固有MD参照 → スクリプト実行 → 判断、という一連の流れ） | 単純な機械チェックだけでなく「このアプリは何か」を理解する行為を含むため |

### 今回は作らなかったもの（見送り理由）

| 候補 | 見送った理由 |
|---|---|
| `skills/github-sync/` | `project-open` と内容が重複する。単独で切り出すほどの複雑さがまだ無い |
| `skills/safe-git/` | commit/push/ブランチ運用は共通ルール第5章で十分カバーできている。追加の実装効果が薄い |
| `skills/cloud-run-deploy/` | `app-ryosan` に既に専用の安全装置（`skills/cloud-run-safe-development/`）があり、動作実績もある。ここで汎用版を作ると重複・競合するため、**触らない**。他のCloud Runアプリが増えたときに、app-ryosanの資産を壊さない形で抽出することを検討する |
| `scripts/open-project.sh` | ディレクトリ移動を自動化する効果は小さい。`check-handoff.sh`実行の方が優先度が高い |
| `scripts/sync-github.sh` | `git fetch`/`git pull` は単純なので、ラップする安全上のメリットが薄い |
| `scripts/safe-deploy.sh` | デプロイ方式が4系統ある（Cloud Run/Firebase/GitHub Pages/静的HTML）ため、汎用スクリプトは中途半端になりやすい。既存のapp-ryosanの専用スクリプトを壊さないことを優先 |

これらが必要になったのは、実際の運用でどのAIも同じ手作業を繰り返し、
かつ間違えた実例が出てから、ということが分かってから追加してください。

---

## 関連

- `gcp-devops-setup-mcp/` — Cloud Run + GitHub のセットアップを自動化する MCP サーバー
