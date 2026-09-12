#!/usr/bin/env bash
#
# check-gcp-project.sh — このアプリの想定GCPプロジェクトと、実際にgcloudが
#                          向いているプロジェクトが一致しているか確認する。
#
# 使い方:
#   cd <アプリのリポジトリ>
#   ~/ai-dev/scripts/check-gcp-project.sh
#
# CLAUDE.md または GEMINI.md の「2-5. デプロイ方式」にある
# 「GCPプロジェクト: 」欄を読み取り、現在の gcloud 設定と比較する。
# 別アプリのGCPプロジェクトを誤って操作する事故を防ぐための確認(第7章)。
#
# この行が無い/空欄のアプリ(静的HTML・Firebaseのみ等、GCPプロジェクトを
# 使わないアプリ)では、その旨を伝えて正常終了する(エラーにしない)。

set -u

MD_FILE=""
for f in CLAUDE.md GEMINI.md; do
  if [ -f "$f" ]; then
    MD_FILE="$f"
    break
  fi
done

if [ -z "$MD_FILE" ]; then
  echo "NG: CLAUDE.md も GEMINI.md も見つかりません。 pwd: $(pwd)"
  exit 1
fi

RAW="$(grep -m1 'GCPプロジェクト' "$MD_FILE" || true)"
EXPECTED="$(echo "$RAW" | sed -E 's/^[^:]*: *//')"
# テンプレートのプレースホルダー「（該当する場合）」等を空欄扱いにする
case "$EXPECTED" in
  *"（"*"）"*|"") EXPECTED="" ;;
esac

if [ -z "$EXPECTED" ]; then
  echo "情報: $MD_FILE にGCPプロジェクトの記載がありません。"
  echo "     GCPを使わないアプリ(静的HTML/Firebaseのみ等)であれば問題ありません。"
  echo "     Cloud Run等でGCPを使うアプリなら、先に記入してください。"
  exit 0
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "情報: この環境には gcloud がありません(Claudeのリモート環境など)。"
  echo "     このアプリの想定プロジェクト: $EXPECTED"
  echo "     Cloud Shellで実際にGCP操作をする前に、このスクリプトを再実行してください。"
  exit 0
fi

CURRENT="$(gcloud config get-value project 2>/dev/null || true)"

echo "想定プロジェクト($MD_FILE): $EXPECTED"
echo "現在のgcloud設定        : $CURRENT"

if [ "$CURRENT" != "$EXPECTED" ]; then
  echo "NG: プロジェクトが一致しません。GCP操作を中止してください。"
  echo "    別アプリのGCPプロジェクトを誤って操作する事故を防ぐための確認です(第7章)。"
  exit 1
fi

echo "OK: プロジェクトが一致しています。"
exit 0
