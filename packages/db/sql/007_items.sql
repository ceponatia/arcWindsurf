-- Item definitions (template / immutable library items)
CREATE TABLE IF NOT EXISTS item_definitions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  definition_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_definitions_category ON item_definitions(category);
CREATE INDEX IF NOT EXISTS idx_item_definitions_created_at ON item_definitions(created_at DESC);

-- Item instances (per-session copies created when session starts)
CREATE TABLE IF NOT EXISTS item_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL,
  definition_snapshot JSONB NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_instances_session ON item_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_item_instances_definition ON item_instances(definition_id);
CREATE INDEX IF NOT EXISTS idx_item_instances_owner ON item_instances(owner_type, owner_id);
