#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ENV_PATH = os.path.expanduser("~/bot/line_bot/.env")
load_dotenv(ENV_PATH, override=False)

DB_URL = os.getenv("DB_URL") or os.getenv("DATABASE_URL")
if not DB_URL:
    print("DB_URL is not configured", file=sys.stderr)
    sys.exit(2)

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


def ensure_schema(conn: psycopg.Connection):
    conn.execute(SCHEMA_SQL)


def ensure_user_exists(conn: psycopg.Connection, user_id: str):
    conn.execute(
        """
        INSERT INTO line_users (user_id)
        VALUES (%s)
        ON CONFLICT (user_id) DO UPDATE
          SET last_seen = NOW(),
              updated_at = NOW()
        """,
        (user_id,),
    )


def parse_job(payload: dict) -> tuple[str, str, str]:
    job = payload.get("job")
    if isinstance(job, dict):
        user_id = str(job.get("user_id", "")).strip()
        reply_token = str(job.get("reply_token", "")).strip()
        user_msg = str(job.get("user_msg", "")).strip()
        if user_id and reply_token and user_msg:
            return user_id, reply_token, user_msg

    user_id = str(payload.get("user_id", "")).strip()
    reply_token = str(payload.get("reply_token", "")).strip()
    user_msg = str(payload.get("user_msg", "")).strip()
    if user_id and reply_token and user_msg:
        return user_id, reply_token, user_msg

    raise ValueError("missing required job fields")


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: ingest_line_queue_file.py <queue_file>", file=sys.stderr)
        return 2

    file_path = Path(sys.argv[1])
    with file_path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    user_id, reply_token, user_msg = parse_job(payload)

    with psycopg.connect(DB_URL) as conn:
        with conn.transaction():
            ensure_schema(conn)
            ensure_user_exists(conn, user_id)
            conn.execute(
                """
                INSERT INTO queue_line (user_id, reply_token, user_msg, status, error)
                VALUES (%s, %s, %s, 'queued', NULL)
                """,
                (user_id, reply_token, user_msg),
            )

    print(f"queued user_id={user_id} msg={user_msg[:40]!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
