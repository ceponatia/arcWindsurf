-- Session Workspace Drafts persistence
--
-- Stores in-progress session configurations before they are finalized.
-- Allows users to save their work and continue later.
--
-- @see dev-docs/planning/opus-refactor.md - Phase 0.3

CREATE TABLE IF NOT EXISTS session_workspace_drafts (
  id TEXT PRIMARY KEY,
  
  -- User ownership (future: link to users table)
  user_id TEXT NOT NULL DEFAULT 'default',
  
  -- Draft name for identification
  name TEXT,
  
  -- Complete workspace state as JSON
  -- Contains: setting, locations, npcs, player, tags selections
  workspace_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Current active step in the wizard
  current_step TEXT NOT NULL DEFAULT 'setting',
  
  -- Per-step validation state
  -- Keys: step names, Values: { valid: boolean, errors: string[] }
  validation_state JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_session_workspace_drafts_user
  ON session_workspace_drafts(user_id);

-- Index for finding recent drafts
CREATE INDEX IF NOT EXISTS idx_session_workspace_drafts_updated
  ON session_workspace_drafts(updated_at DESC);

-- Auto-cleanup: drafts older than 30 days can be pruned
-- This is handled by the application, but we create an index to support it
CREATE INDEX IF NOT EXISTS idx_session_workspace_drafts_created
  ON session_workspace_drafts(created_at);
