-- Per-session state slices for location, inventory, and time
-- These tables store the current mutable baseline for each slice
-- keyed by session. They are intentionally lightweight JSONB blobs
-- so the governor/state-manager can evolve their shapes over time.

CREATE TABLE IF NOT EXISTS session_location_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_location_state_session
  ON session_location_state(session_id);

CREATE TABLE IF NOT EXISTS session_inventory_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_inventory_state_session
  ON session_inventory_state(session_id);

CREATE TABLE IF NOT EXISTS session_time_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_time_state_session
  ON session_time_state(session_id);
