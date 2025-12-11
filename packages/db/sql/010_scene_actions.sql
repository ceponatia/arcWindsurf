-- Scene Actions: Track recent actions in scenes for multi-action turns
--
-- This table stores actions performed in a scene that can be observed
-- by NPCs and used for action sequencing and interrupt handling.
--
-- Each action has:
-- - A unique ID and timestamp
-- - An actor (player or NPC)
-- - A type (speech, action, thought, observation, etc.)
-- - Content/description
-- - Observable entities (who can perceive this action)
-- - Location context
--
-- Actions are used for:
-- - NPC awareness of recent scene events
-- - Action sequencing with interrupts
-- - Building scene state for multi-NPC coordination

CREATE TABLE IF NOT EXISTS scene_actions (
  -- Identity
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  
  -- Actor (who performed this action)
  actor_id TEXT NOT NULL, -- Player ID or NPC instance ID
  actor_type TEXT NOT NULL CHECK (actor_type IN ('player', 'npc')),
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'speech',
    'action',
    'thought',
    'observation',
    'other'
  )),
  content TEXT NOT NULL, -- Description or content of the action
  
  -- Observability
  observable_by TEXT[] NOT NULL DEFAULT '{}', -- Array of entity IDs who can observe this
  location_id TEXT, -- Location where action occurred
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  turn_number INTEGER, -- Optional turn number for correlation
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for querying actions by session (most common query)
CREATE INDEX IF NOT EXISTS idx_scene_actions_session
  ON scene_actions(session_id, created_at DESC);

-- Index for querying actions by location
CREATE INDEX IF NOT EXISTS idx_scene_actions_location
  ON scene_actions(session_id, location_id, created_at DESC)
  WHERE location_id IS NOT NULL;

-- Index for querying actions by turn
CREATE INDEX IF NOT EXISTS idx_scene_actions_turn
  ON scene_actions(session_id, turn_number)
  WHERE turn_number IS NOT NULL;

-- Comments
COMMENT ON TABLE scene_actions IS 'Actions performed in scenes, observable by NPCs for coordination';
COMMENT ON COLUMN scene_actions.observable_by IS 'Array of entity IDs (player or NPCs) who can observe this action';
COMMENT ON COLUMN scene_actions.metadata IS 'Additional action context (target, requirements, state changes, etc.)';
