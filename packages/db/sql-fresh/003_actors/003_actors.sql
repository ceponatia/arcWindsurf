-- Domain: Actors
-- Migration: 003_actors.sql
-- Description: Sessions, events, actor states, projections (World Bus core)
-- Created: 2026-01-07 (Fresh World Bus schema)

-- ============================================================================
-- Sessions (World Bus session management)
-- ============================================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template references
  setting_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  player_character_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  location_map_id UUID REFERENCES location_maps(id) ON DELETE SET NULL,
  
  -- Session state
  status TEXT DEFAULT 'active',  -- 'active', 'paused', 'ended'
  mode TEXT DEFAULT 'solo',  -- 'solo', 'multiplayer'
  current_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Event sourcing
  event_seq BIGINT NOT NULL DEFAULT 0,
  
  -- Metrics
  total_tokens_used BIGINT DEFAULT 0,
  turn_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sessions_status_check CHECK (status IN ('active', 'paused', 'ended')),
  CONSTRAINT sessions_mode_check CHECK (mode IN ('solo', 'multiplayer'))
);

CREATE INDEX idx_sessions_owner ON sessions(owner_email);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_updated ON sessions(updated_at DESC);
CREATE INDEX idx_sessions_owner_status ON sessions(owner_email, status);

-- ============================================================================
-- Events (Append-only World Bus event log)
-- ============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sequence BIGINT NOT NULL,
  
  -- Event metadata
  type TEXT NOT NULL,  -- 'SPOKE', 'MOVED', 'TICK', 'PLAYER_ACTION', etc.
  payload JSONB NOT NULL,
  
  -- Actor tracking
  actor_id TEXT,  -- Which actor emitted this event (e.g., 'player', 'npc:barkeep')
  actor_type TEXT,  -- 'player', 'npc', 'system'
  
  -- Causality
  caused_by_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  
  -- Timing
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(session_id, sequence)
);

CREATE INDEX idx_events_session_seq ON events(session_id, sequence);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_actor ON events(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_events_actor_type ON events(actor_type) WHERE actor_type IS NOT NULL;
CREATE INDEX idx_events_timestamp ON events(session_id, timestamp);
CREATE INDEX idx_events_causality ON events(caused_by_event_id) WHERE caused_by_event_id IS NOT NULL;

-- ============================================================================
-- Actor States (XState snapshots for NPCs, players, systems)
-- ============================================================================

CREATE TABLE actor_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Actor identification
  actor_type TEXT NOT NULL,  -- 'npc', 'player', 'system'
  actor_id TEXT NOT NULL,  -- Unique within session, e.g., 'barkeep', 'player_1'
  
  -- Template reference (for NPCs)
  entity_profile_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  
  -- XState machine state + custom state
  state JSONB NOT NULL,
  -- Expected state structure:
  -- {
  --   "machine": { ... XState persisted state ... },
  --   "locationId": "uuid",
  --   "inventory": [...],
  --   "affinity": { "player": 50, ... },
  --   "hygiene": { ... },
  --   "schedule": { ... },
  --   "memory": { ... }
  -- }
  
  -- Event tracking
  last_event_seq BIGINT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(session_id, actor_id),
  CONSTRAINT actor_states_type_check CHECK (actor_type IN ('npc', 'player', 'system'))
);

CREATE INDEX idx_actor_states_session ON actor_states(session_id);
CREATE INDEX idx_actor_states_type ON actor_states(actor_type);
CREATE INDEX idx_actor_states_session_type ON actor_states(session_id, actor_type);

-- ============================================================================
-- Session Projections (Materialized state from event stream)
-- ============================================================================

CREATE TABLE session_projections (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Projected state (computed from events)
  location JSONB NOT NULL DEFAULT '{}',
  -- { "currentLocationId": "uuid", "visitedLocations": [...], "discoveredExits": [...] }
  
  inventory JSONB NOT NULL DEFAULT '{}',
  -- { "items": [...], "currency": 0, "capacity": 100 }
  
  time JSONB NOT NULL DEFAULT '{}',
  -- { "worldTime": "2026-01-07T08:00:00Z", "daysPassed": 0, "timeOfDay": "morning" }
  
  world_state JSONB NOT NULL DEFAULT '{}',
  -- Flexible container for additional state: weather, factions, quests, etc.
  
  -- Event tracking
  last_event_seq BIGINT NOT NULL DEFAULT 0,
  
  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_projections_seq ON session_projections(last_event_seq);

-- ============================================================================
-- Session Participants (Multiplayer support)
-- ============================================================================

CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Display
  display_name TEXT,
  
  -- Role and permissions
  role TEXT NOT NULL DEFAULT 'player',  -- 'player', 'gm', 'spectator'
  can_control_npcs BOOLEAN DEFAULT FALSE,
  can_edit_world BOOLEAN DEFAULT FALSE,
  
  -- Actor link
  actor_id TEXT,  -- Links to actor_states.actor_id for this participant
  
  -- Status
  status TEXT DEFAULT 'connected',  -- 'connected', 'disconnected', 'away'
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, user_email),
  CONSTRAINT session_participants_role_check CHECK (role IN ('player', 'gm', 'spectator'))
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_email);

-- ============================================================================
-- Session Plugin State (Per-session plugin data)
-- ============================================================================

CREATE TABLE session_plugin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, plugin_id)
);

CREATE INDEX idx_session_plugin_state_session ON session_plugin_state(session_id);

-- ============================================================================
-- Session Tags (Session-level tag activation)
-- ============================================================================

CREATE TABLE session_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  priority_override INTEGER,  -- Override default tag priority
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, tag_id)
);

CREATE INDEX idx_session_tags_session ON session_tags(session_id);
CREATE INDEX idx_session_tags_enabled ON session_tags(session_id, enabled) WHERE enabled = TRUE;
