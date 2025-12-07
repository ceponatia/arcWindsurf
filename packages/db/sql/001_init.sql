-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  character_template_id TEXT NOT NULL,
  setting_template_id TEXT NOT NULL,
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

-- Per-NPC transcripts (agent-facing)
CREATE TABLE IF NOT EXISTS npc_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, npc_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_npc_messages_session_npc_idx ON npc_messages(session_id, npc_id, idx);

-- Character instances (per-session snapshots)
CREATE TABLE IF NOT EXISTS character_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_snapshot JSONB NOT NULL,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_character_instances_session ON character_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_character_instances_template ON character_instances(template_id);

-- Setting instances (per-session snapshots)
CREATE TABLE IF NOT EXISTS setting_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_snapshot JSONB NOT NULL,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_setting_instances_session ON setting_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_setting_instances_template ON setting_instances(template_id);

-- Dynamic character templates
CREATE TABLE IF NOT EXISTS character_profiles (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dynamic setting templates
CREATE TABLE IF NOT EXISTS setting_profiles (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
