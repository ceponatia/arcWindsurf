-- Dialogue trees
CREATE TABLE dialogue_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB NOT NULL DEFAULT '{}',
  start_node_id TEXT NOT NULL,
  nodes JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dialogue_trees_npc ON dialogue_trees(npc_id);

-- Dialogue state
CREATE TABLE dialogue_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  npc_id TEXT NOT NULL,
  tree_id UUID REFERENCES dialogue_trees(id),
  current_node_id TEXT,
  visited_nodes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, npc_id)
);
