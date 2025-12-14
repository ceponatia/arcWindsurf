-- Per-session NPC affinity state
-- Stores relationship scores, action history, and milestones
-- between player and each NPC in the session.

CREATE TABLE IF NOT EXISTS session_affinity_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, npc_id)
);

-- Index for efficient session-wide lookups
CREATE INDEX IF NOT EXISTS idx_session_affinity_state_session
  ON session_affinity_state(session_id);

-- Index for per-NPC lookups within a session
CREATE INDEX IF NOT EXISTS idx_session_affinity_state_session_npc
  ON session_affinity_state(session_id, npc_id);
