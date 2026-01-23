-- Workspace drafts
--
-- Stores in-progress session workspace state so the builder can autosave and
-- restore after refresh/unload.

CREATE TABLE workspace_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT,
  workspace_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step TEXT NOT NULL DEFAULT 'setting',
  validation_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspace_drafts_user ON workspace_drafts(user_id);
CREATE INDEX idx_workspace_drafts_updated ON workspace_drafts(updated_at);
