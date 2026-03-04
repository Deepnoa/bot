#!/usr/bin/env bash
set -euo pipefail
BASE="$HOME/bot/github_queue_local"
LOCAL_QUEUE="$BASE/queue"
LOG_DIR="$BASE/log"
LOCK_DIR="$BASE/lock"
LOCK_PATH="$LOCK_DIR/worker.lock"
REMOTE_QUEUE="/home/r6174775/public_html/deepnoa.com/bot/github/queue"
REMOTE_ARCHIVE="/home/r6174775/public_html/deepnoa.com/bot/github/archive"
mkdir -p "$LOCAL_QUEUE" "$LOG_DIR" "$LOCK_DIR"
log() { echo "[$(date -Is)] $*" | tee -a "$LOG_DIR/worker.log" >/dev/null; }
# --- lock (atomic) ---
if ! mkdir "$LOCK_PATH" 2>/dev/null; then
  log "already running; exit"
  exit 0
fi
cleanup() { rmdir "$LOCK_PATH" 2>/dev/null || true; }
trap cleanup EXIT
log "sync start"
# queue をローカルへ取得（リモートは消さない。消すのは archive 移動で行う）
rsync -av "onamae:${REMOTE_QUEUE}/" "${LOCAL_QUEUE}/" >> "$LOG_DIR/worker.log" 2>&1 || { log "rsync failed (non-fatal)"; }
# 処理対象（新しい順に最大10件）
mapfile -t files < <(ls -1t "$LOCAL_QUEUE" 2>/dev/null | head -n 10 || true)
log "found ${#files[@]} files"
for f in "${files[@]}"; do
  file="$LOCAL_QUEUE/$f"
  [ -f "$file" ] || continue
  log "process $f"
  # push判定（今の ingest.php の meta.event を想定）
  if grep -q "\"event\":\"push\"" "$file" 2>/dev/null; then
    log "push detected -> deploy"
    "$BASE/deploy_on_push.sh" >> "$LOG_DIR/deploy.log" 2>&1 || log "deploy failed"
  else
    log "not push -> skip deploy"
  fi
  # リモート側を archive に移動（再実行防止）
  ssh onamae "mkdir -p ${REMOTE_ARCHIVE} && if [ -f ${REMOTE_QUEUE}/$f ]; then mv ${REMOTE_QUEUE}/$f ${REMOTE_ARCHIVE}/$f; fi" >> "$LOG_DIR/worker.log" 2>&1 || { log "remote archive move failed (non-fatal)" }
  # ローカルも削除
  rm -f "$file" || true
done
log "done"
