#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "usage: line_notify.sh <message>" >&2
  exit 2
fi

MESSAGE="$1"
ENV_PATH_PRIMARY="${HOME}/bot/github_queue_local/.env"
ENV_PATH_FALLBACK="${HOME}/bot/line_bot/.env"

if [ -f "$ENV_PATH_PRIMARY" ]; then
  set -a
  . "$ENV_PATH_PRIMARY"
  set +a
elif [ -f "$ENV_PATH_FALLBACK" ]; then
  set -a
  . "$ENV_PATH_FALLBACK"
  set +a
fi

TOKEN="${LINE_ACCESS_TOKEN:-${LINE_CHANNEL_ACCESS_TOKEN:-}}"
ADMIN_ID="${LINE_ADMIN_USER_ID:-}"
DRY_RUN_FLAG="${DRY_RUN:-0}"

if [ -z "$ADMIN_ID" ]; then
  echo "[line_notify] LINE_ADMIN_USER_ID is not set; skip" >&2
  exit 0
fi

if [ "$DRY_RUN_FLAG" = "1" ]; then
  echo "[line_notify][DRY_RUN] to=$ADMIN_ID msg=$MESSAGE" >&2
  exit 0
fi

if [ -z "$TOKEN" ]; then
  echo "[line_notify] LINE access token is not set; skip" >&2
  exit 1
fi

payload="$({ python3 - "$ADMIN_ID" "$MESSAGE" <<'PY'
import json
import sys
to = sys.argv[1]
message = sys.argv[2]
print(json.dumps({"to": to, "messages": [{"type": "text", "text": message[:4900]}]}, ensure_ascii=False))
PY
} )"

resp_file="$(mktemp)"
status_code="$(curl -sS -o "$resp_file" -w '%{http_code}' \
  -X POST "https://api.line.me/v2/bot/message/push" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$payload")"

if [ "$status_code" != "200" ]; then
  echo "[line_notify] push failed status=$status_code body=$(cat "$resp_file")" >&2
  rm -f "$resp_file"
  exit 1
fi

rm -f "$resp_file"
echo "[line_notify] push success" >&2
