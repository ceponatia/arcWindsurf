-- World Bus sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL REFERENCES user_accounts(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  setting_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  player_character_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  location_map_id UUID REFERENCES location_maps(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',  -- 'active', 'paused', 'ended'
  mode TEXT DEFAULT 'solo',  -- 'solo', 'multiplayer'
  event_seq BIGINT NOT NULL DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_owner ON sessions(owner_email);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Events (append-only World Bus event log)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sequence BIGINT NOT NULL,
  type TEXT NOT NULL,  -- 'SPOKE', 'MOVED', 'TICK', 'PLAYER_ACTION', etc.
  payload JSONB NOT NULL,
  actor_id TEXT,  -- Which actor emitted this event
  caused_by_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, sequence)
);

CREATE INDEX idx_events_session_seq ON events(session_id, sequence);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_actor ON events(actor_id);
CREATE INDEX idx_events_timestamp ON events(session_id, timestamp);

-- Actor states (XState snapshots)
CREATE TABLE actor_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,  -- 'npc', 'player', 'system'
  actor_id TEXT NOT NULL,
  entity_profile_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  state JSONB NOT NULL,  -- XState persisted state + custom fields
  last_event_seq BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, actor_id)
);

CREATE INDEX idx_actor_states_session ON actor_states(session_id);
CREATE INDEX idx_actor_states_type ON actor_states(actor_type);

-- Session projections (materialized state)
CREATE TABLE session_projections (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  location JSONB NOT NULL DEFAULT '{}',  -- Current location state
  inventory JSONB NOT NULL DEFAULT '{}',  -- Player inventory
  time JSONB NOT NULL DEFAULT '{}',  -- World time
  world_state JSONB NOT NULL DEFAULT '{}',  -- Additional world state
  last_event_seq BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session participants (multiplayer)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES user_accounts(email) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'player',  -- 'player', 'gm', 'spectator'
  actor_id TEXT,  -- Links to actor_states.actor_id
  status TEXT DEFAULT 'connected',
  can_control_npcs BOOLEAN DEFAULT FALSE,
  can_edit_world BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_email)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);

-- Session plugin state
CREATE TABLE session_plugin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, plugin_id)
);

-- Session tags (simplified - session level only)
CREATE TABLE session_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, tag_id)
);
