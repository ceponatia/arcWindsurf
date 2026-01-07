-- Knowledge nodes (facts, memories, beliefs)
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,  -- NULL = global knowledge
  owner_email TEXT NOT NULL,
  actor_id TEXT,  -- Which actor knows this (NULL = world fact)
  node_type TEXT NOT NULL,  -- 'fact', 'event', 'relationship', 'rumor', 'belief'
  content TEXT NOT NULL,
  summary TEXT,
  confidence REAL DEFAULT 1.0,
  importance REAL DEFAULT 0.5,
  decay_rate REAL DEFAULT 0.0,
  source_type TEXT,  -- 'witnessed', 'heard', 'inferred', 'told'
  source_entity_id TEXT,
  source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  last_recalled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_nodes_session ON knowledge_nodes(session_id);
CREATE INDEX idx_knowledge_nodes_actor ON knowledge_nodes(session_id, actor_id);
CREATE INDEX idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_embedding ON knowledge_nodes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Knowledge edges (relationships between nodes)
CREATE TABLE knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,  -- 'knows', 'contradicts', 'implies', 'caused_by'
  strength REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id, relation)
);

CREATE INDEX idx_knowledge_edges_from ON knowledge_edges(from_node_id);
CREATE INDEX idx_knowledge_edges_to ON knowledge_edges(to_node_id);
