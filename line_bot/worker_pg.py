#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import time
import traceback

import psycopg
import requests
from dotenv import load_dotenv

ENV_PATH = os.path.expanduser("~/bot/line_bot/.env")
load_dotenv(ENV_PATH, override=False)

DB_URL = os.getenv("DB_URL")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "192.168.11.11:11434")
MODEL = os.getenv("MODEL", "gpt-oss:20b")
NUM_CTX = int(os.getenv("NUM_CTX", "4096"))
DRY_RUN = os.getenv("DRY_RUN", "1") == "1"
HISTORY_TURNS = int(os.getenv("HISTORY_TURNS", "8"))
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "あなたは株式会社DeepnoaのAIアシスタントです。"
    "ユーザーの相談に対して、やさしく・わかりやすく・カジュアルに返答してください。"
    "簡潔に、相手の直前の発言にフォーカスしてください。",
)

LINE_TOKEN = os.getenv("LINE_ACCESS_TOKEN", "")
LINE_API = "https://api.line.me/v2/bot/message/reply"

if not DB_URL:
    raise RuntimeError("DB_URL is not set in ~/bot/line_bot/.env")

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS queue_line (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'queued',
  user_id TEXT NOT NULL,
  reply_token TEXT NOT NULL,
  user_msg TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_line_status_created
  ON queue_line (status, created_at);

CREATE TABLE IF NOT EXISTS line_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_messages_user_created
  ON line_messages (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS line_users (
  user_id TEXT PRIMARY KEY,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_role TEXT,
  last_message TEXT,
  message_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


def ensure_schema():
    with psycopg.connect(DB_URL) as conn:
        with conn.transaction():
            conn.execute(SCHEMA_SQL)


def ask_ollama(messages: list[dict[str, str]]) -> str:
    url = f"http://{OLLAMA_HOST}/api/chat"
    payload = {
        "model": MODEL,
        "messages": messages,
        "options": {"temperature": 0.2, "num_ctx": NUM_CTX},
        "stream": False,
    }
    response = requests.post(url, json=payload, timeout=180)
    response.raise_for_status()
    data = response.json()
    return (data.get("message") or {}).get("content", "").strip()


def reply_line(reply_token: str, text: str):
    if DRY_RUN:
        print(f"[DRY_RUN] would reply: {text[:120]!r}")
        return

    if not LINE_TOKEN:
        raise RuntimeError("LINE_ACCESS_TOKEN is empty (set in .env or enable DRY_RUN=1)")

    headers = {
        "Authorization": f"Bearer {LINE_TOKEN}",
        "Content-Type": "application/json",
    }
    body = {
        "replyToken": reply_token,
        "messages": [{"type": "text", "text": (text or "…")[:4900]}],
    }

    response = requests.post(LINE_API, headers=headers, json=body, timeout=30)
    response.raise_for_status()


def get_recent_history(user_id: str, limit: int = HISTORY_TURNS) -> list[dict[str, str]]:
    with psycopg.connect(DB_URL) as conn:
        rows = conn.execute(
            """
            SELECT role, message
            FROM line_messages
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, limit),
        ).fetchall()

    rows = list(reversed(rows))
    history: list[dict[str, str]] = []
    for role, message in rows:
        if role not in ("user", "assistant"):
            continue
        history.append({"role": role, "content": message})
    return history


def save_message(conn: psycopg.Connection, user_id: str, role: str, message: str):
    conn.execute(
        """
        INSERT INTO line_messages (user_id, role, message)
        VALUES (%s, %s, %s)
        """,
        (user_id, role, message),
    )
    conn.execute(
        """
        INSERT INTO line_users (user_id, last_seen, last_role, last_message, message_count, updated_at)
        VALUES (%s, NOW(), %s, %s, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE
          SET last_seen = NOW(),
              last_role = EXCLUDED.last_role,
              last_message = EXCLUDED.last_message,
              message_count = line_users.message_count + 1,
              updated_at = NOW()
        """,
        (user_id, role, message[:2000]),
    )


def pick_job() -> tuple[int, str, str, str] | None:
    with psycopg.connect(DB_URL) as conn:
        with conn.transaction():
            row = conn.execute(
                """
                SELECT id, user_id, reply_token, user_msg
                FROM queue_line
                WHERE status = 'queued'
                ORDER BY id ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
                """
            ).fetchone()

            if not row:
                return None

            job_id, user_id, reply_token, user_msg = row
            conn.execute(
                "UPDATE queue_line SET status='processing', error=NULL WHERE id=%s",
                (job_id,),
            )
            return (job_id, user_id, reply_token, user_msg)


def mark_done(job_id: int, user_id: str, user_msg: str, answer: str):
    with psycopg.connect(DB_URL) as conn:
        with conn.transaction():
            save_message(conn, user_id, "user", user_msg)
            save_message(conn, user_id, "assistant", answer)
            conn.execute("UPDATE queue_line SET status='done', error=NULL WHERE id=%s", (job_id,))


def mark_failed(job_id: int, user_id: str, user_msg: str, error_text: str):
    with psycopg.connect(DB_URL) as conn:
        with conn.transaction():
            save_message(conn, user_id, "user", user_msg)
            conn.execute(
                "UPDATE queue_line SET status='failed', error=%s WHERE id=%s",
                (error_text[:1000], job_id),
            )


def build_messages(user_id: str, user_msg: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if SYSTEM_PROMPT.strip():
        messages.append({"role": "system", "content": SYSTEM_PROMPT.strip()})
    messages.extend(get_recent_history(user_id))
    messages.append({"role": "user", "content": user_msg})
    return messages


def main():
    ensure_schema()

    print(f"[START] DB={DB_URL}")
    print(
        f"[START] OLLAMA=http://{OLLAMA_HOST} MODEL={MODEL} "
        f"NUM_CTX={NUM_CTX} DRY_RUN={DRY_RUN} HISTORY_TURNS={HISTORY_TURNS}"
    )

    while True:
        try:
            picked = pick_job()
            if not picked:
                print("[IDLE] no queued rows")
                time.sleep(2)
                continue

            job_id, user_id, reply_token, user_msg = picked
            print(f"[PICK] id={job_id} user={user_id} msg={user_msg[:60]!r}")

            try:
                messages = build_messages(user_id, user_msg)
                answer = ask_ollama(messages)
                reply_line(reply_token, answer)
                mark_done(job_id, user_id, user_msg, answer)
                print(f"[DONE] id={job_id}")
            except Exception as error:
                print("[ERR] processing failed:", repr(error))
                traceback.print_exc()
                try:
                    mark_failed(job_id, user_id, user_msg, str(error))
                except Exception:
                    print("[ERR] failed to set failed status")
                    traceback.print_exc()
                print(f"[FAIL] id={job_id} err={error}")

        except KeyboardInterrupt:
            print("\n[STOP] KeyboardInterrupt")
            return
        except Exception as error:
            print("[FATAL]", repr(error))
            traceback.print_exc()
            time.sleep(3)


if __name__ == "__main__":
    main()
