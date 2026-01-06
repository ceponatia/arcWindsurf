-- Domain: System
-- Migration: 004_system_schema.sql
-- Description: Tags, Plugins, and Multiplayer support

-- Prompt Tags (002, 020, 032)
CREATE TABLE IF NOT EXISTS prompt_tags (
  id TEXT PRIMARY KEY,                  -- e.g., 'combat', 'stealth'
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB DEFAULT '[]',
  plugin_id TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Tag Bindings (002, 024)
CREATE TABLE IF NOT EXISTS session_tag_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  tag_id TEXT NOT NULL REFERENCES prompt_tags(id),
  entity_id TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_tag_bindings_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_tag_bindings_owner_session ON session_tag_bindings(owner_email, session_id);

-- Registered Plugins (035)
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,                  -- e.g., '@arcagentic/plugin-combat'
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  manifest JSONB NOT NULL,              -- {schemas, tools, agents, routes, ui}
  enabled BOOLEAN DEFAULT TRUE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plugin State Per Session (035)
CREATE TABLE IF NOT EXISTS session_plugin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  state_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, plugin_id)
);

-- Session Participants (035)
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'player',  -- 'player', 'gm', 'spectator'
  character_instance_id TEXT,
  status TEXT DEFAULT 'connected',      -- 'connected', 'disconnected', 'away'
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  can_control_npcs BOOLEAN DEFAULT FALSE,
  can_edit_world BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_email)
);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_email);
