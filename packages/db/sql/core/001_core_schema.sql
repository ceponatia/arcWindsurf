-- Domain: Core
-- Migration: 001_core_schema.sql
-- Description: Core session and user management

-- User accounts (019, 022)
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  roles TEXT[] DEFAULT '{player}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User sessions (001, 024, 032)
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  character_template_id TEXT NOT NULL,
  setting_template_id TEXT NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'active',
  mode TEXT DEFAULT 'solo',
  event_sequence BIGINT DEFAULT 0,
  snapshot_at BIGINT,
  turn_count INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  last_turn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_sessions_owner_email_nonempty CHECK (length(owner_email) > 0),
  CONSTRAINT user_sessions_no_public_owner CHECK (owner_email <> 'public')
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_sessions_id_owner ON user_sessions(id, owner_email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_owner_created ON user_sessions(owner_email, created_at DESC);

-- Messages (001, 024, 032)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  idx INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat',
  tool_calls JSONB,
  embedding vector(1536),
  parent_id TEXT,
  branch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_owner_email_nonempty CHECK (length(owner_email) > 0),
  CONSTRAINT messages_no_public_owner CHECK (owner_email <> 'public'),
  CONSTRAINT fk_messages_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE,
  UNIQUE(session_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_messages_session_idx ON messages(session_id, idx);
CREATE INDEX IF NOT EXISTS idx_messages_owner_session_idx ON messages(owner_email, session_id, idx);

-- NPC Messages (001, 011, 024, 027, 036)
CREATE TABLE IF NOT EXISTS npc_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  content TEXT NOT NULL,
  witnessed_by TEXT[] DEFAULT '{}',
  tone TEXT,
  emotion_scores JSONB,
  location_id TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT npc_messages_owner_email_nonempty CHECK (length(owner_email) > 0),
  CONSTRAINT npc_messages_no_public_owner CHECK (owner_email <> 'public'),
  CONSTRAINT fk_npc_messages_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE,
  UNIQUE(session_id, npc_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_npc_messages_session_npc_idx ON npc_messages(session_id, npc_id, idx);
CREATE INDEX IF NOT EXISTS idx_npc_messages_owner_session_npc_idx ON npc_messages(owner_email, session_id, npc_id, idx);

-- Session History (009, 024)
CREATE TABLE IF NOT EXISTS session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  turn_idx INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT session_history_owner_email_nonempty CHECK (length(owner_email) > 0),
  CONSTRAINT session_history_no_public_owner CHECK (owner_email <> 'public'),
  CONSTRAINT fk_session_history_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_history_owner_session_turn ON session_history(owner_email, session_id, turn_idx);

-- Scene Actions (010, 024)
CREATE TABLE IF NOT EXISTS scene_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  actions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scene_actions_owner_email_nonempty CHECK (length(owner_email) > 0),
  CONSTRAINT scene_actions_no_public_owner CHECK (owner_email <> 'public'),
  CONSTRAINT fk_scene_actions_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_scene_actions_owner_session ON scene_actions(owner_email, session_id, created_at DESC);
