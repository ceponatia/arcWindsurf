-- Phase 5: Multiplayer & Plugins Support
-- As per dev-docs/database-migration-refactor.md

-- Session participants (for multiplayer)
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  
  -- Participant identity
  user_email TEXT NOT NULL,
  display_name TEXT,
  
  -- Role
  role TEXT NOT NULL DEFAULT 'player',  -- 'player', 'gm', 'spectator'
  character_instance_id TEXT,           -- Which character they control
  
  -- Connection state
  status TEXT DEFAULT 'connected',      -- 'connected', 'disconnected', 'away'
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Permissions
  can_control_npcs BOOLEAN DEFAULT FALSE,
  can_edit_world BOOLEAN DEFAULT FALSE,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_email);

-- Registered plugins
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,                  -- e.g., '@arcagentic/plugin-combat'
  
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  
  -- Plugin manifest
  manifest JSONB NOT NULL,              -- {schemas, tools, agents, routes, ui}
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plugin state per session
CREATE TABLE IF NOT EXISTS session_plugin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  
  -- Plugin-specific state
  state_json JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, plugin_id)
);
