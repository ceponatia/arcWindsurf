-- Audit log for state changes per turn
CREATE TABLE IF NOT EXISTS state_change_log (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  turn_idx INTEGER,
  patch_count INTEGER NOT NULL,
  modified_paths TEXT[] NOT NULL,
  agent_types TEXT[] NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_change_log_session_created ON state_change_log(session_id, created_at DESC);
