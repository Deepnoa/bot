#!/usr/bin/env bash
set -euo pipefail
BASE="$HOME/bot/github_queue_local"
LOCAL_QUEUE="$BASE/queue"
LOG_DIR="$BASE/log"
LOCK_DIR="$BASE/lock"
LOCK_PATH="$LOCK_DIR/worker.lock"
REMOTE_QUEUE="/home/r6174775/public_html/deepnoa.com/bot/github/queue"
REMOTE_ARCHIVE="/home/r6174775/public_html/deepnoa.com/bot/github/archive"
NOTIFY_SH="$BASE/line_notify.sh"
mkdir -p "$LOCAL_QUEUE" "$LOG_DIR" "$LOCK_DIR"

log() { echo "[$(date -Is)] $*" | tee -a "$LOG_DIR/worker.log" >/dev/null; }

extract_push_info() {
  local file="$1"
  python3 - "$file" <<'PY'
import json
import sys

file = sys.argv[1]
try:
    with open(file, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    print("\t\t\t\t")
    raise SystemExit(0)

meta = data.get("meta") or {}
payload = data.get("payload") or {}

event = meta.get("event") or ""
repo = meta.get("repo") or (payload.get("repository") or {}).get("full_name", "")
ref = meta.get("ref") or payload.get("ref", "")
sender = meta.get("sender") or (payload.get("sender") or {}).get("login", "")
head = (payload.get("head_commit") or {}).get("id", "")

print("\t".join([str(event), str(repo), str(ref), str(sender), str(head)]))
PY
}

# --- lock (atomic) ---
if ! mkdir "$LOCK_PATH" 2>/dev/null; then
  log "already running; exit"
  exit 0
fi
cleanup() { rmdir "$LOCK_PATH" 2>/dev/null || true; }
trap cleanup EXIT

log "sync start"
rsync -av "onamae:${REMOTE_QUEUE}/" "${LOCAL_QUEUE}/" >> "$LOG_DIR/worker.log" 2>&1 || { log "rsync failed (non-fatal)"; }
mapfile -t files < <(ls -1t "$LOCAL_QUEUE" 2>/dev/null | head -n 10 || true)
log "found ${#files[@]} files"

for f in "${files[@]}"; do
  file="$LOCAL_QUEUE/$f"
  [ -f "$file" ] || continue
  log "process $f"

  info="$(extract_push_info "$file")"
  IFS=$'\t' read -r event repo ref sender head_commit <<< "$info"

  is_push=0
  if [ "$event" = "push" ]; then
    is_push=1
  elif grep -Eq '"event"[[:space:]]*:[[:space:]]*"push"' "$file" 2>/dev/null; then
    is_push=1
  fi

  if [ "$is_push" -eq 1 ]; then
    log "push detected -> deploy"
    deploy_result="SUCCESS"
    if ! "$BASE/deploy_on_push.sh" >> "$LOG_DIR/deploy.log" 2>&1; then
      deploy_result="FAILED"
      log "deploy failed"
    fi

    short_head=""
    if [ -n "$head_commit" ]; then
      short_head="${head_commit:0:7}"
    fi

    message="[GitHub Push] ${deploy_result}\nrepo: ${repo:-unknown}\nref: ${ref:-unknown}\nby: ${sender:-unknown}"
    if [ -n "$short_head" ]; then
      message="${message}\ncommit: ${short_head}"
    fi

    if [ -x "$NOTIFY_SH" ]; then
      "$NOTIFY_SH" "$message" >> "$LOG_DIR/worker.log" 2>&1 || log "line notify failed"
    else
      log "line notifier missing: $NOTIFY_SH"
    fi
  else
    log "not push -> skip deploy"
  fi

  ssh onamae "mkdir -p ${REMOTE_ARCHIVE} && if [ -f ${REMOTE_QUEUE}/$f ]; then mv ${REMOTE_QUEUE}/$f ${REMOTE_ARCHIVE}/$f; fi" >> "$LOG_DIR/worker.log" 2>&1 || { log "remote archive move failed (non-fatal)"; }
  rm -f "$file" || true
done

log "done"
