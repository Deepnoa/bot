CREATE TABLE IF NOT EXISTS line_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_messages_user_created
  ON line_messages (user_id, created_at DESC);
