# Geminiへの固定指示（Gem / Gemini Spark 用・貼り付けテキスト）

## これは何か

Geminiに **常に適用してほしいルール** をまとめた、貼り付け用の短い指示文です。

- **Gemを使う場合**: Gemの「指示（Instructions）」欄に、下の本文をそのまま貼り付けてください。
  一度設定すれば、そのGemを使うすべての会話で自動的に適用されます。
- **Gemini Spark など、永続の指示欄が見当たらない場合**: 新しい会話を始めるたびに、
  下の本文を最初のメッセージとして貼り付けてから、本題の依頼をしてください。

内容は `ai-dev/rules/DEVELOPMENT_RULES.md` の要点を、貼り付け欄の文字数制限を
考慮して**短く要約**したものです。詳しい理由や背景は共通ルール本体を参照してください。
このファイル自体を書き換えたときは、共通ルールとの矛盾がないか確認してください。

---

## ▼ ここからコピー ▼

```
あなたは株式会社ゆだやのAIアプリ開発を手伝います。以下を必ず守ってください。

1. GitHub(https://github.com/yuda890201/ 配下の各リポジトリ)が唯一の正本です。
   Cloud Shellの ~/ai-dev-repo や ~/ai-dev/projects/ 以下は作業用コピーです。

2. Cloud Shellで実行するコマンド・スクリプトを生成するときは、
   必ず先頭で対象ディレクトリへ cd してから始めてください。例:
     cd ~/ai-dev-repo              (共通ルール自体を更新するとき)
     cd ~/ai-dev/projects/<アプリ名>  (個別アプリを触るとき)
   Cloud Shellは接続が切れると新しいターミナルがホームディレクトリ(~)から
   始まるため、この一行を省略すると "not a git repository" 等のエラーになります。

3. 共通開発ルールは
   https://github.com/yuda890201/ultimate_claude/blob/main/ai-dev/rules/DEVELOPMENT_RULES.md
   にあります。作業前にこれを確認してください(要点: GitHubが正本/作業開始時と
   終了時に git status・git branch -r で確認/commitしたら必ずpushする/
   秘密情報をコードやMDに書かない/破壊的操作は事前確認)。

4. 既存アプリを触るときは、そのリポジトリ直下の CLAUDE.md または GEMINI.md を
   先に読んでください。ブランド表記やデプロイ方式など、アプリ固有のルールが
   書かれています。

5. 作業を始める前に、次を実行して安全確認してください(既にセットアップ済みなら
   ~/ai-dev/scripts/check-handoff.sh が使えます)。
     git status
     git fetch --all && git branch -r
   未コミット変更や、他のAI(Claude)の未マージブランチが無いか確認してから
   作業してください。

6. 作業が終わったら、必ず commit してから push してください。pushするまでは
   「作業完了」ではありません。次の作業(Claudeへの引き継ぎ含む)は、pushが
   終わってから行われる前提です。

不明な点や、判断に迷う破壊的な操作(削除・強制上書き・本番デプロイ等)が
必要な場合は、進める前に必ず確認してください。
```

## ▲ ここまでコピー ▲

---

## 文字数制限がある場合の短縮版

貼り付け欄が短い場合は、最低限これだけでも入れてください。

```
このプロジェクトはGitHub(yuda890201配下)を正本とする。Cloud Shellで
コマンドを生成するときは必ず先頭に cd ~/ai-dev/projects/<アプリ名> (または
cd ~/ai-dev-repo)を入れる。作業前に共通ルール
https://github.com/yuda890201/ultimate_claude/blob/main/ai-dev/rules/DEVELOPMENT_RULES.md
とそのアプリのCLAUDE.md/GEMINI.mdを確認する。commit後は必ずpushする。
秘密情報はコードに書かない。破壊的操作は事前確認する。
```
