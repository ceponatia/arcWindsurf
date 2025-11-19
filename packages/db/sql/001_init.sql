-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  setting_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_messages_session_idx ON messages(session_id, idx);

-- Character instances (per-session overrides)
CREATE TABLE IF NOT EXISTS character_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  template_character_id TEXT NOT NULL,
  baseline JSONB NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, template_character_id)
);
CREATE INDEX IF NOT EXISTS idx_character_instances_session ON character_instances(session_id);

-- Setting instances (per-session overrides)
CREATE TABLE IF NOT EXISTS setting_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  template_setting_id TEXT NOT NULL,
  baseline JSONB NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, template_setting_id)
);
CREATE INDEX IF NOT EXISTS idx_setting_instances_session ON setting_instances(session_id);

-- Dynamic character templates
CREATE TABLE IF NOT EXISTS character_templates (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dynamic setting templates
CREATE TABLE IF NOT EXISTS setting_templates (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
