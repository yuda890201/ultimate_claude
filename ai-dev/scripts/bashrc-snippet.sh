#!/usr/bin/env bash
#
# bashrc-snippet.sh — Cloud Shellの ~/.bashrc に1回だけ追記するスニペット
#
# 何をするか:
#   Cloud Shellで新しいターミナルを開くたびに自動実行され、
#   - ultimate_claude(共通ルール/テンプレート/プロンプト/スキル/スクリプト)を
#     ~/ai-dev-repo に clone / (6時間に1回)pull する
#   - ~/ai-dev/{rules,templates,prompts,skills,scripts} を
#     ~/ai-dev-repo/ai-dev/ 配下へのシンボリックリンクとして用意する
#   - ~/ai-dev/{projects,logs,config} を作成する
#   を毎回自動で行う。スマホからは長いセットアップコマンドを打たずに済む。
#
# 導入方法(初回のみ、Cloud Shellで1回実行する):
#
#   cat ~/ai-dev-repo/ai-dev/scripts/bashrc-snippet.sh >> ~/.bashrc 2>/dev/null || \
#   curl -fsSL https://raw.githubusercontent.com/yuda890201/ultimate_claude/main/ai-dev/scripts/bashrc-snippet.sh >> ~/.bashrc
#
#   その後、ターミナルを開き直すか `source ~/.bashrc` を実行すれば有効になる。
#
# 安全に関する注意:
#   - ここにあるのは「読み取り専用のgit操作とシンボリックリンク作成」だけで、
#     既存のプロジェクト(~/ai-dev/projects/以下)には一切触れない。
#   - ネットワークが無い状態でも、git操作が失敗するだけでターミナル自体は
#     使えるように、すべて `|| true` 相当のフェイルセーフにしてある。

ai_dev_sync() {
  local REPO_DIR="$HOME/ai-dev-repo"
  local STAMP="$HOME/.ai-dev-last-sync"
  local REPO_URL="https://github.com/yuda890201/ultimate_claude"

  if [ ! -d "$REPO_DIR/.git" ]; then
    git clone -q "$REPO_URL" "$REPO_DIR" 2>/dev/null && touch "$STAMP"
  elif [ ! -f "$STAMP" ] || [ -n "$(find "$STAMP" -mmin +360 2>/dev/null)" ]; then
    git -C "$REPO_DIR" pull -q origin main 2>/dev/null && touch "$STAMP"
  fi

  mkdir -p "$HOME/ai-dev/projects" "$HOME/ai-dev/logs" "$HOME/ai-dev/config" 2>/dev/null

  if [ -d "$REPO_DIR/ai-dev" ]; then
    for d in rules templates prompts skills scripts; do
      ln -sfn "$REPO_DIR/ai-dev/$d" "$HOME/ai-dev/$d" 2>/dev/null
    done
  fi
}

ai_dev_sync
