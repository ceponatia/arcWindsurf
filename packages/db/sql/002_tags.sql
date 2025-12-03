-- Prompt Tags (Global definitions)
CREATE TABLE IF NOT EXISTS prompt_tags (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT 'admin',
  name TEXT NOT NULL,
  short_description TEXT,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner, name)
);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_owner ON prompt_tags(owner);

-- Session Tag Instances (Per-session snapshots)
CREATE TABLE IF NOT EXISTS session_tag_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  tag_id TEXT, -- Loose reference to original tag, nullable/preserves history if tag deleted
  name TEXT NOT NULL,
  short_description TEXT,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_tag_instances_session ON session_tag_instances(session_id);
