-- Phase 3: Event Sourcing Foundation
-- As per dev-docs/database-migration-refactor.md

-- Game Events (Append-only log)
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_id TEXT,
  sequence BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_events_session_seq ON game_events(session_id, sequence);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(type);

-- Session Snapshots (Periodic state captures)
CREATE TABLE IF NOT EXISTS session_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  last_event_id UUID REFERENCES game_events(id),
  last_sequence BIGINT NOT NULL,
  state_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_snapshots_session_seq ON session_snapshots(session_id, last_sequence DESC);
