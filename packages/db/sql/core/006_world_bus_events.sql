-- Domain: Core
-- Migration: 006_world_bus_events.sql
-- Description: World Bus event sourcing tables for Phase 1 & 2

-- NOTE: This is a PostgreSQL migration. Some SQL Server-oriented linters expect the
-- following directive near the top of the file; keep it commented to avoid breaking
-- execution on PostgreSQL.
-- SET QUOTED_IDENTIFIER ON

-- Sessions table for World Bus (simplified session management)
-- This is separate from user_sessions for the new event-driven architecture
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_seq BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table (append-only event log for World Bus)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sequence BIGINT NOT NULL,
  UNIQUE(session_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_events_session_seq ON events(session_id, sequence);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor_id);

-- Actor states (current snapshot of XState actor state machines)
CREATE TABLE IF NOT EXISTS actor_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL, -- 'npc', 'player', 'system'
  actor_id TEXT NOT NULL,   -- e.g., 'barkeep', 'player_1'
  state JSONB NOT NULL,     -- XState persisted state
  last_event_seq BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_actor_states_session ON actor_states(session_id);
CREATE INDEX IF NOT EXISTS idx_actor_states_type ON actor_states(actor_type);

-- Session projections (materialized state from event log)
CREATE TABLE IF NOT EXISTS session_projections (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  location JSONB NOT NULL,
  inventory JSONB NOT NULL,
  time JSONB NOT NULL,
  npcs JSONB NOT NULL,
  last_event_seq BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_projections_seq ON session_projections(last_event_seq);
