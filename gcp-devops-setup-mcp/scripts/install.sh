#!/usr/bin/env bash
# One-shot installer for gcp-devops-setup-mcp: clones (or updates) this
# repository, builds the server, and registers it into a Claude Code
# or Claude Desktop config. Safe to re-run; it only pulls/rebuilds and
# merges its own entry into whatever config already exists.
#
# Usage:
#   ./install.sh --target claude-code [--cwd /path/to/project]
#   ./install.sh --target claude-desktop
#
# Environment:
#   GCP_DEVOPS_MCP_HOME  where to clone/keep the repo (default: ~/.gcp-devops-setup-mcp)

set -euo pipefail

REPO_URL="https://github.com/yuda890201/ultimate_claude.git"
INSTALL_DIR="${GCP_DEVOPS_MCP_HOME:-$HOME/.gcp-devops-setup-mcp}"

for cmd in git node npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command \"$cmd\" was not found on PATH." >&2
    exit 1
  fi
done

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing checkout at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "Cloning $REPO_URL into $INSTALL_DIR..."
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

SERVER_DIR="$INSTALL_DIR/gcp-devops-setup-mcp"

echo "Installing dependencies and building..."
npm --prefix "$SERVER_DIR" install

echo "Registering MCP server..."
node "$SERVER_DIR/scripts/configure-mcp.js" "$@"
