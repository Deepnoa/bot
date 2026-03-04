#!/usr/bin/env bash
set -euo pipefail
echo "[deploy] START $(date -Is)"
# TODO: ここを本番手順に差し替える（いまは安全のため dry-run）
# 例（Next.jsの場合）:
# WORKDIR="$HOME/.openclaw/workspace/line-bot-webhook"
# cd "$WORKDIR"
# git pull
# npm ci
# npm run build
# rsync -av --delete ... onamae:... 
echo "[deploy] dry-run only (no changes applied)"
echo "[deploy] DONE $(date -Is)"
