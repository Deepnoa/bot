#!/usr/bin/env bash
set -euo pipefail
REMOTE_QUEUE="${LINE_REMOTE_QUEUE:-/home/r6174775/public_html/deepnoa.com/bot/line/deepnoa/queue}"
LOCAL_QUEUE="${HOME}/bot/line_queue_local/queue"
mkdir -p "${LOCAL_QUEUE}"
echo "[1] syncing line queue from onamae server: ${REMOTE_QUEUE}"
rsync -av "onamae:${REMOTE_QUEUE}/" "${LOCAL_QUEUE}/"
echo

echo "[2] local files"
ls -la "${LOCAL_QUEUE}" || true
