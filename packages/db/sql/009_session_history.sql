-- Session history with debug data per turn/agent
CREATE TABLE IF NOT EXISTS session_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  turn_idx INTEGER NOT NULL,
  owner_user_id TEXT NULL,
  player_input TEXT NOT NULL,
  context_json JSONB,
  debug_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, turn_idx)
);

CREATE INDEX IF NOT EXISTS idx_session_history_session_turn ON session_history(session_id, turn_idx);
