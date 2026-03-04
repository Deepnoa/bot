#!/usr/bin/env bash
set -euo pipefail
REMOTE_QUEUE="/home/r6174775/public_html/deepnoa.com/bot/github/queue"
LOCAL_QUEUE="${HOME}/bot/github_queue_local/queue"
echo "[1] syncing queue from onamae server"
rsync -av "onamae:${REMOTE_QUEUE}/" "${LOCAL_QUEUE}/"
echo

echo "[2] local files"
ls -la "${LOCAL_QUEUE}" || true

echo

echo "[3] latest file preview"
latest=$(ls -1t "${LOCAL_QUEUE}" 2>/dev/null | head -n 1 || true)
if [ -n "$latest" ]; then
  echo "Latest file: $latest"
  echo "------"
  head -c 600 "${LOCAL_QUEUE}/${latest}" || true
  echo
  echo "------"
else
  echo "No files found"
fi

echo

echo "DONE"
