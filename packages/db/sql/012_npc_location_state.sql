-- NPC Location State persistence for schedule resolution and lazy simulation
--
-- This migration adds tables to track where NPCs are, what they're doing,
-- and cache their simulation state for performance. Enables the location
-- persistence layer described in dev-docs/31-npc-simulation-and-performance.md
-- and dev-docs/32-npc-encounters-and-occupancy.md.

-- =============================================================================
-- Session NPC Location State
-- =============================================================================
-- Tracks the current location and activity of each NPC in a session.
-- This is the primary state object for NPC whereabouts.

CREATE TABLE IF NOT EXISTS session_npc_location_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  
  -- Location fields
  location_id TEXT NOT NULL,
  sub_location_id TEXT,
  
  -- Activity (stored as JSONB for flexibility)
  activity_json JSONB NOT NULL,
  
  -- Arrival time (stored as JSONB GameTime)
  arrived_at_json JSONB NOT NULL,
  
  -- Whether the NPC can be interrupted
  interruptible BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Optional reference to the schedule slot that placed them here
  schedule_slot_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each NPC can only have one location state per session
  UNIQUE(session_id, npc_id)
);

-- Index for querying all NPCs in a session
CREATE INDEX IF NOT EXISTS idx_session_npc_location_state_session
  ON session_npc_location_state(session_id);

-- Index for querying NPCs at a specific location
CREATE INDEX IF NOT EXISTS idx_session_npc_location_state_location
  ON session_npc_location_state(session_id, location_id);

-- =============================================================================
-- Session NPC Simulation Cache
-- =============================================================================
-- Caches simulation state for lazy simulation. Stores the last computed state
-- and schedule decisions for the current day. Enables the tiered simulation
-- strategy where major NPCs are eagerly updated and minor NPCs are lazily computed.

CREATE TABLE IF NOT EXISTS session_npc_simulation_cache (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  
  -- Last time this NPC's state was computed (JSONB GameTime)
  last_computed_at_json JSONB NOT NULL,
  
  -- Current computed state (references session_npc_location_state)
  -- Stored as JSONB for flexibility during schema evolution
  current_state_json JSONB NOT NULL,
  
  -- Cached schedule decisions for the current day
  -- Map of slotId -> ResolvedScheduleOption
  day_decisions_json JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each NPC can only have one simulation cache per session
  UNIQUE(session_id, npc_id)
);

-- Index for querying simulation cache by session
CREATE INDEX IF NOT EXISTS idx_session_npc_simulation_cache_session
  ON session_npc_simulation_cache(session_id);

-- =============================================================================
-- Session Location Occupancy Cache
-- =============================================================================
-- Optional: Caches the occupancy state for locations the player has visited.
-- This is a performance optimization - occupancy can be computed on demand
-- from session_npc_location_state if this table is not used.

CREATE TABLE IF NOT EXISTS session_location_occupancy_cache (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  
  -- Full occupancy state (JSONB LocationOccupancy)
  occupancy_json JSONB NOT NULL,
  
  -- When this occupancy was computed (JSONB GameTime)
  computed_at_json JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each location can only have one occupancy cache per session
  UNIQUE(session_id, location_id)
);

-- Index for querying occupancy cache by session
CREATE INDEX IF NOT EXISTS idx_session_location_occupancy_cache_session
  ON session_location_occupancy_cache(session_id);
