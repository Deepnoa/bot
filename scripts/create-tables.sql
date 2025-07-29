-- Create line_messages table
CREATE TABLE IF NOT EXISTS line_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_line_messages_user_id ON line_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_line_messages_created_at ON line_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_line_messages_timestamp ON line_messages(timestamp);

-- Create line_users table for user management
CREATE TABLE IF NOT EXISTS line_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  profile_picture_url TEXT,
  status_message TEXT,
  first_interaction TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for line_users
CREATE INDEX IF NOT EXISTS idx_line_users_line_user_id ON line_users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_users_last_interaction ON line_users(last_interaction);

-- Create function to update message count
CREATE OR REPLACE FUNCTION update_user_message_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO line_users (line_user_id, message_count, last_interaction)
  VALUES (NEW.user_id, 1, NEW.created_at)
  ON CONFLICT (line_user_id)
  DO UPDATE SET
    message_count = line_users.message_count + 1,
    last_interaction = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user stats
CREATE TRIGGER trigger_update_user_message_count
  AFTER INSERT ON line_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_message_count();
