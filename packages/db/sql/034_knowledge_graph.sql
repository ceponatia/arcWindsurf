-- Phase 4: Knowledge Graph / NPC Memory
-- As per dev-docs/database-migration-refactor.md

-- Knowledge nodes (facts, memories, relationships)
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  session_id TEXT REFERENCES user_sessions(id) ON DELETE CASCADE, -- NULL = global knowledge
  owner_email TEXT NOT NULL,
  npc_id TEXT,                          -- Which NPC knows this (NULL = world fact)
  
  -- Content
  node_type TEXT NOT NULL,              -- 'fact', 'event', 'relationship', 'rumor', 'belief'
  content TEXT NOT NULL,
  summary TEXT,                         -- Short version for prompts
  
  -- Confidence & decay
  confidence REAL DEFAULT 1.0,          -- How certain (rumors < facts)
  importance REAL DEFAULT 0.5,          -- Relevance weight
  decay_rate REAL DEFAULT 0.0,          -- Memory fade per day
  
  -- Source tracking
  source_type TEXT,                     -- 'witnessed', 'heard', 'inferred', 'told'
  source_entity_id TEXT,                -- Who told them
  source_event_id UUID,                 -- Which event created this (refs game_events)
  
  -- Timestamps
  learned_at TIMESTAMPTZ DEFAULT NOW(), -- When acquired
  last_recalled_at TIMESTAMPTZ,         -- For importance boosting
  expires_at TIMESTAMPTZ,               -- Optional TTL
  
  -- Embedding for semantic search
  embedding vector(1536),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_session ON knowledge_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_npc ON knowledge_nodes(session_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding ON knowledge_nodes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Knowledge edges (relationships between nodes)
CREATE TABLE IF NOT EXISTS knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  from_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  
  relation TEXT NOT NULL,               -- 'knows', 'contradicts', 'implies', 'caused_by'
  strength REAL DEFAULT 1.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_node_id, to_node_id, relation)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_from ON knowledge_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_to ON knowledge_edges(to_node_id);
