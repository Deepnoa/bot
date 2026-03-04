#!/usr/bin/env bash
set -euo pipefail

echo "[deploy] START $(date -Is)"

WORKDIR="${OPENCLAW_WORKDIR:-$HOME/.openclaw/workspace/line-bot-webhook}"
TARGET_BRANCH="${OPENCLAW_BRANCH:-main}"

if [ ! -d "$WORKDIR/.git" ]; then
  echo "[deploy] ERROR: not a git repo: $WORKDIR"
  exit 1
fi

cd "$WORKDIR"
echo "[deploy] workdir=$WORKDIR"

# ローカル未コミットがあるとデプロイ結果が不定になるため停止
if [ -n "$(git status --porcelain)" ]; then
  echo "[deploy] ERROR: workspace has uncommitted changes"
  git status --short
  exit 1
fi

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "$TARGET_BRANCH" ]; then
  echo "[deploy] switching branch: $current_branch -> $TARGET_BRANCH"
  git switch "$TARGET_BRANCH"
fi

echo "[deploy] fetch origin"
git fetch origin

echo "[deploy] pull --ff-only origin/$TARGET_BRANCH"
git pull --ff-only origin "$TARGET_BRANCH"

echo "[deploy] npm ci"
npm ci

echo "[deploy] npm run build"
npm run build

# 任意: サービス再起動コマンドを環境変数で指定
# 例: OPENCLAW_RESTART_CMD=sudo systemctl restart line-bot-webhook
if [ -n "${OPENCLAW_RESTART_CMD:-}" ]; then
  echo "[deploy] restart service"
  bash -lc "$OPENCLAW_RESTART_CMD"
fi

echo "[deploy] DONE $(date -Is)"
