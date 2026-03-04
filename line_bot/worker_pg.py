#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, time, requests, traceback
import psycopg
from dotenv import load_dotenv

ENV_PATH = os.path.expanduser("~/bot/line_bot/.env")
load_dotenv(ENV_PATH, override=True)  # ★既存envを上書き

DB_URL = os.getenv("DB_URL")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "192.168.11.11:11434")
MODEL = os.getenv("MODEL", "gpt-oss:20b")
NUM_CTX = int(os.getenv("NUM_CTX", "4096"))
DRY_RUN = os.getenv("DRY_RUN", "1") == "1"

LINE_TOKEN = os.getenv("LINE_ACCESS_TOKEN", "")
LINE_API = "https://api.line.me/v2/bot/message/reply"

if not DB_URL:
    raise RuntimeError("DB_URL is not set in ~/bot/line_bot/.env")

def ask_ollama(prompt: str) -> str:
    url = f"http://{OLLAMA_HOST}/api/chat"
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "options": {"temperature": 0.2, "num_ctx": NUM_CTX},
        "stream": False,
    }
    r = requests.post(url, json=payload, timeout=180)
    r.raise_for_status()
    data = r.json()
    return (data.get("message") or {}).get("content", "").strip()

def reply_line(reply_token: str, text: str):
    if DRY_RUN:
        print(f"[DRY_RUN] would reply: {text[:120]!r}")
        return
    if not LINE_TOKEN:
        raise RuntimeError("LINE_ACCESS_TOKEN is empty (set in .env or enable DRY_RUN=1)")
    headers = {"Authorization": f"Bearer {LINE_TOKEN}", "Content-Type": "application/json"}
    body = {"replyToken": reply_token, "messages": [{"type": "text", "text": (text or "…")[:4900]}]}
    r = requests.post(LINE_API, headers=headers, json=body, timeout=30)
    r.raise_for_status()

def main():
    print(f"[START] DB={DB_URL}")
    print(f"[START] OLLAMA=http://{OLLAMA_HOST} MODEL={MODEL} NUM_CTX={NUM_CTX} DRY_RUN={DRY_RUN}")

    while True:
        try:
            with psycopg.connect(DB_URL) as conn:
                with conn.transaction():
                    row = conn.execute("""
                      SELECT id, user_id, reply_token, user_msg
                      FROM queue_line
                      WHERE status='queued'
                      ORDER BY id ASC
                      FOR UPDATE SKIP LOCKED
                      LIMIT 1
                    """).fetchone()

                    if not row:
                        print("[IDLE] no queued rows")
                        time.sleep(2)
                        continue

                    job_id, user_id, reply_token, user_msg = row
                    print(f"[PICK] id={job_id} user={user_id} msg={user_msg[:60]!r}")
                    conn.execute("UPDATE queue_line SET status='processing', error=NULL WHERE id=%s", (job_id,))
                    print(f"[DB] set processing id={job_id}")

            # 推論＆返信（DBロック外）
            answer = ask_ollama(user_msg)
            reply_line(reply_token, answer)

            # done 更新（ここで落ちてる可能性が高いので try/except を細かく）
            try:
                with psycopg.connect(DB_URL) as conn2:
                    with conn2.transaction():
                        conn2.execute("UPDATE queue_line SET status='done', error=NULL WHERE id=%s", (job_id,))
                print(f"[DONE] id={job_id}")
            except Exception as e:
                print("[ERR] failed to set done:", repr(e))
                traceback.print_exc()
                # failed に落とす
                with psycopg.connect(DB_URL) as conn3:
                    with conn3.transaction():
                        conn3.execute("UPDATE queue_line SET status='failed', error=%s WHERE id=%s", (str(e), job_id))
                print(f"[FAIL] id={job_id} err={e}")

        except KeyboardInterrupt:
            print("\n[STOP] KeyboardInterrupt")
            return
        except Exception as e:
            print("[FATAL]", repr(e))
            traceback.print_exc()
            time.sleep(3)

if __name__ == "__main__":
    main()
