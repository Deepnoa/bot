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
