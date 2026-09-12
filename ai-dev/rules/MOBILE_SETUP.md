# スマホからの開発環境セットアップガイド

湯田代表が **iPhone（スマホのブラウザ）から Google Cloud Shell を使って**、
Gemini・Claudeと開発を進めるための設定手順です。

このガイドは `DEVELOPMENT_RULES.md` を補足するものです。共通ルール自体は
変わりません。「スマホでの操作をどう楽にするか」だけを扱います。

---

## 0. 前提（重要）

このガイドの手順は、湯田代表が実際に **Cloud Shell上で1回だけ実行**するものです。
Claude（このAI）自身はCloud Shellにもgcloudにもアクセスできないため、
ここに書かれたコマンドをClaudeが代わりに実行することはできません。

---

## 1. Cloud Shellをスマホのホーム画面に追加する

1. スマホのブラウザ（Safari / Chrome）で `https://shell.cloud.google.com` を開く
2. ブラウザのメニューから「ホーム画面に追加」を選ぶ

これで、アプリのようにワンタップでCloud Shellを開けるようになります。

---

## 2. 初回セットアップ（1回だけ実行）

Cloud Shellを開いたら、次を1回だけ実行してください。

```bash
# 1. GitHub認証(初回のみ。ブラウザでの承認が必要)
gh auth login

# 2. ai-dev共通基盤をclone
git clone https://github.com/yuda890201/ultimate_claude ~/ai-dev-repo

# 3. 自動セットアップを ~/.bashrc に登録する
cat ~/ai-dev-repo/ai-dev/scripts/bashrc-snippet.sh >> ~/.bashrc

# 4. 今すぐ有効化する
source ~/.bashrc
```

これ以降、Cloud Shellで新しいターミナルを開くたびに、

- `~/ai-dev-repo` の共通ルール・テンプレート・プロンプト・スクリプトが
  自動で最新化される（6時間に1回、ネットワーク越しに確認）
- `~/ai-dev/{rules,templates,prompts,skills,scripts}` が
  自動的に用意される
- `~/ai-dev/{projects,logs,config}` が自動的に用意される

ようになります。**スマホで長いコマンドを打つのは、この初回だけです。**

---

## 3. GitHub認証について

`gh auth login` は初回だけ実行すれば、認証情報はCloud Shellの
永続ホームディレクトリ（`$HOME`。Googleアカウントに紐づき、
どのGCPプロジェクトを使っていても保持される）に保存され、
以後は自動的に使われます。

**認証情報（トークン等）は、絶対にGitHubへcommitしないでください**
（共通ルール第10章）。`gh auth login` は対話的にブラウザ認証するだけなので、
この点は心配ありません。

---

## 4. Google Cloud プロジェクトの整理

このアカウントには複数のアプリがあり、GCPプロジェクトも複数に
分かれている可能性があります（現時点で判明しているのは
`app-ryosan` の `yuda-store-ai-1788800335` のみ）。

スマホでプロジェクトIDを毎回手打ちするのは大変なので、
**`gcloud config configurations`（名前付き設定の切り替え機能）** を使うことを
おすすめします。

### 4-1. 現在のプロジェクト一覧を確認する

```bash
gcloud projects list
```

### 4-2. アプリごとに名前付き設定を作る（例）

```bash
# 例: app-ryosan用の設定を作る
gcloud config configurations create ryosan --project yuda-store-ai-1788800335 --account <あなたのGoogleアカウント>

# 別のアプリ用の設定も同様に作る(プロジェクトIDが分かったら)
# gcloud config configurations create <アプリ名> --project <プロジェクトID> --account <あなたのGoogleアカウント>
```

### 4-3. 切り替える（デプロイ前に必ず実行）

```bash
gcloud config configurations activate ryosan
gcloud config get-value project    # 意図したプロジェクトになっているか確認
```

これにより、スマホでは長いプロジェクトIDを打たず、
`gcloud config configurations activate <短い名前>` だけで
安全に切り替えられます。**ただし切り替え後は必ず
`~/ai-dev/scripts/check-gcp-project.sh` で、
そのアプリのCLAUDE.md/GEMINI.mdに記録された値と一致するか確認してください**
（共通ルール第7章）。

### 4-4. プロジェクトを1つにまとめるべきか？

現状、アプリごとにGCPプロジェクトが分かれているようです。まとめるかどうかは
運用上の判断ですが、参考として:

| 方針 | メリット | デメリット |
|---|---|---|
| アプリごとに別プロジェクト（現状） | 誤操作の影響範囲が1アプリに限定される | プロジェクトが増えるほど管理が大変 |
| 少数のプロジェクトにまとめる | 切り替えの手間が減る | 誤操作の影響範囲が広がる |

**今すぐ決める必要はありません。** 上記の名前付き設定を使えば、
プロジェクトを増やしたまま運用しても、スマホでの操作負担は変わりません。

---

## 5. Geminiとのやり取りを楽にする（提案・任意）

現在、Geminiアプリでの出力を手でコピー＆ペーストしてCloud Shellに
貼り付ける運用とのことです。これはスマホでは特に負担が大きい部分です。

**任意の改善案として、Gemini CLIの導入を検討することをおすすめします。**

Gemini CLIを使うと、Cloud Shellの中で直接

```bash
gemini
```

と入力して対話を始められ、Claude Code (CLI) と同じように、
「アプリを直して」と自然言語で伝えるだけでファイル操作・commit・push まで
Gemini自身が行えるようになります。**コピー＆ペーストの手順が丸ごと不要になります。**

導入するかどうかは湯田代表の判断ですが、興味があれば次の手順で
試すことができます（Cloud Shellで実行）。

```bash
npm install -g @google/gemini-cli
gemini    # 初回はGoogleアカウントでの認証が必要
```

現在の「Gemの画面でプロンプトを作り、それをコピペする」という運用自体は、
`ai-dev/prompts/NEW_APP_LAUNCH_PROMPT.md` の使い方として今まで通り有効です。
Gemini CLIを導入した場合も、生成したプロンプトを`gemini`に貼り付ける、
という使い方に変わるだけで、プロンプト自体の作り方は変わりません。

### 5-1. Geminiに毎回同じルールを守らせる（Gem / Gemini Sparkなど）

新アプリ立ち上げ以外の、日常的なスクリプト生成でも「必ず`cd`してから
コマンドを生成する」等のルールを毎回守ってほしい場合は、
`ai-dev/prompts/GEMINI_STANDING_INSTRUCTIONS.md` の内容を、
使っているGemini製品の「指示」設定欄に貼り付けてください
（Gemの「指示」欄など。永続設定欄が見当たらない製品の場合は、
会話の最初に毎回貼り付ける）。

---

## 6. 接続が不安定なとき（任意・上級者向け）

スマホの回線は途切れやすく、Cloud Shellとの接続が切れると、
実行中の `gemini` や `claude` が終了してしまうことがあります。

これを避けたい場合は `tmux`（Cloud Shellに標準搭載）を使うと、
接続が切れてもセッションの中身は生き続け、再接続後に元の画面へ戻れます。

```bash
tmux new -A -s main    # "main"という名前のセッションを作成 or 再接続
```

これは任意です。まずは導入せず、困ったときに試してください。

---

## 7. まとめ：スマホでの1日の流れ（イメージ）

```
1. ホーム画面のCloud Shellをタップ
2. (自動で ~/ai-dev が最新化されている)
3. cd ~/ai-dev/projects/<アプリ名>
4. ~/ai-dev/scripts/check-handoff.sh を実行(安全確認)
5. Gemini or Claude に自然言語で指示
6. 終了前にもう一度 check-handoff.sh を実行し、pushまで完了を確認
```
