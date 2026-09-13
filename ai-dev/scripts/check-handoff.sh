#!/usr/bin/env bash
#
# check-handoff.sh — 作業開始/終了時の安全確認を自動化する
#
# 使い方:
#   cd <アプリのリポジトリ>
#   ~/ai-dev/scripts/check-handoff.sh
#
# 何をするか:
#   共通開発ルール(DEVELOPMENT_RULES.md)第3章・第4章のチェックリストを
#   自動実行し、危険な状態(未コミット変更・未pushコミット・他AIの未マージ
#   ブランチ)を検出する。作業開始時・終了時のどちらでも使える。
#
# 重要な限界(必ず理解してから使うこと):
#   このスクリプトは「その場で見える範囲の危険」を見つけることしかできない。
#   commitすらされていない他AIの作業や、pushされていない他AIの作業は、
#   このスクリプト(や他のどんな手段)でも検出できない。
#   → だからこそ、commitしたら必ずpushする、という運用そのものが重要になる。
#   このスクリプトの実行自体も、AIがこのスクリプトを呼び忘れれば意味がない。
#   実行を強制する仕組み(shellフック等)は現時点では用意していない。
#   → 各アプリの GEMINI.md / CLAUDE.md の「作業の流れ」に、このスクリプトの
#      実行を必須の手順として明記すること。

set -u

BRANCH="$(git branch --show-current 2>/dev/null || true)"

if [ -z "$BRANCH" ]; then
  echo "NG: ここはGitリポジトリではない(もしくはブランチ無し)。 pwd: $(pwd)"
  exit 1
fi

STATUS=0

echo "=================================================="
echo " 安全確認 (DEVELOPMENT_RULES.md 第3章/第4章)"
echo "=================================================="
echo "[1] pwd            : $(pwd)"
echo "[2] remote         :"
git remote -v | sed 's/^/    /'
echo "[3] branch         : $BRANCH"

echo "[4] 未コミット変更 :"
DIRTY="$(git status --porcelain)"
if [ -n "$DIRTY" ]; then
  echo "$DIRTY" | sed 's/^/    /'
  echo "    ⚠️  未コミットの変更があります。前のAIの作業が残っている可能性があります。"
  STATUS=1
else
  echo "    なし"
fi

echo "[5] git fetch --all を実行"
git fetch --all -q 2>&1 | sed 's/^/    /' || true

UPSTREAM="origin/$BRANCH"
if git rev-parse --verify "$UPSTREAM" >/dev/null 2>&1; then
  BEHIND="$(git log --oneline "$BRANCH..$UPSTREAM" 2>/dev/null || true)"
  AHEAD="$(git log --oneline "$UPSTREAM..$BRANCH" 2>/dev/null || true)"

  echo "[6] GitHub($UPSTREAM)と手元のズレ:"
  if [ -n "$BEHIND" ]; then
    echo "    GitHubにあって手元に無い:"
    echo "$BEHIND" | sed 's/^/      /'
    echo "    → git pull origin $BRANCH で最新化してください"
    STATUS=1
  fi
  if [ -n "$AHEAD" ]; then
    echo "    手元にあってGitHubに無い(未push):"
    echo "$AHEAD" | sed 's/^/      /'
    echo "    ⚠️  push忘れの可能性があります。内容を確認してpushしてください。"
    STATUS=1
  fi
  if [ -z "$BEHIND" ] && [ -z "$AHEAD" ]; then
    echo "    ズレなし"
  fi
else
  echo "[6] このブランチはまだGitHubにpushされていません(${UPSTREAM} が存在しません)"
fi

echo "[7] 他のAIの未マージブランチ:"
OTHER_BRANCHES="$(git branch -r 2>/dev/null | grep -v -E "origin/(HEAD|main|master|${BRANCH})\$" || true)"
if [ -n "$OTHER_BRANCHES" ]; then
  echo "$OTHER_BRANCHES" | sed 's/^/    /'
  echo "    ℹ️  上記ブランチが自分の作業と関係するか確認してください(第3-1章)"
else
  echo "    なし"
fi

echo "=================================================="
if [ "$STATUS" -eq 0 ]; then
  echo "RESULT: OK — 作業を開始/終了してよい状態です"
else
  echo "RESULT: NG — 上記の⚠️を解決してから進めてください"
fi
echo "=================================================="

exit "$STATUS"
