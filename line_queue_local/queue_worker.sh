#!/usr/bin/env bash
set -euo pipefail
BASE="$HOME/bot/line_queue_local"
LOCAL_QUEUE="$BASE/queue"
FAILED_DIR="$BASE/failed"
LOG_DIR="$BASE/log"
LOCK_DIR="$BASE/lock"
LOCK_PATH="$LOCK_DIR/worker.lock"
REMOTE_QUEUE="/home/r6174775/public_html/deepnoa.com/bot/line/queue"
REMOTE_ARCHIVE="/home/r6174775/public_html/deepnoa.com/bot/line/archive"
INGEST_PY="$HOME/bot/line_bot/ingest_line_queue_file.py"
PY_BIN="$HOME/bot/line_bot/venv/bin/python"
mkdir -p "$LOCAL_QUEUE" "$FAILED_DIR" "$LOG_DIR" "$LOCK_DIR"

log() { echo "[$(date -Is)] $*" | tee -a "$LOG_DIR/worker.log" >/dev/null; }

if ! mkdir "$LOCK_PATH" 2>/dev/null; then
  log "already running; exit"
  exit 0
fi
cleanup() { rmdir "$LOCK_PATH" 2>/dev/null || true; }
trap cleanup EXIT

log "sync start"
rsync -av "onamae:${REMOTE_QUEUE}/" "${LOCAL_QUEUE}/" >> "$LOG_DIR/worker.log" 2>&1 || log "rsync failed (non-fatal)"

mapfile -t files < <(ls -1t "$LOCAL_QUEUE" 2>/dev/null | head -n 30 || true)
log "found ${#files[@]} files"

for f in "${files[@]}"; do
  file="$LOCAL_QUEUE/$f"
  [ -f "$file" ] || continue
  log "process $f"
  if "$PY_BIN" "$INGEST_PY" "$file" >> "$LOG_DIR/worker.log" 2>&1; then
    ssh onamae "mkdir -p ${REMOTE_ARCHIVE} && if [ -f ${REMOTE_QUEUE}/$f ]; then mv ${REMOTE_QUEUE}/$f ${REMOTE_ARCHIVE}/$f; fi" >> "$LOG_DIR/worker.log" 2>&1 || log "remote archive move failed (non-fatal)"
    rm -f "$file" || true
    log "done $f"
  else
    mv "$file" "$FAILED_DIR/$f" || true
    log "failed $f (moved to failed)"
  fi
done

log "done"
