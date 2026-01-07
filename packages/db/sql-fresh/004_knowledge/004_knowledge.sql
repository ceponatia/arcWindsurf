-- Domain: Knowledge
-- Migration: 004_knowledge.sql
-- Description: Knowledge graph for semantic memory (facts, beliefs, relationships)
-- Created: 2026-01-07 (Fresh World Bus schema)

-- ============================================================================
-- Knowledge Nodes (Facts, memories, beliefs, rumors)
-- ============================================================================

CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,  -- NULL = global knowledge
  owner_email TEXT NOT NULL,
  actor_id TEXT,  -- Which actor knows this (NULL = world fact)
  
  -- Content
  node_type TEXT NOT NULL,  -- 'fact', 'event', 'relationship', 'rumor', 'belief', 'memory'
  content TEXT NOT NULL,
  summary TEXT,  -- Short version for prompts
  
  -- Trust and importance
  confidence REAL DEFAULT 1.0,  -- How certain (rumors < facts)
  importance REAL DEFAULT 0.5,  -- Relevance weight for retrieval
  decay_rate REAL DEFAULT 0.0,  -- Memory fade per day (0 = permanent)
  
  -- Source tracking
  source_type TEXT,  -- 'witnessed', 'heard', 'inferred', 'told', 'discovered'
  source_entity_id TEXT,  -- Who told them / what revealed it
  source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  
  -- Temporal
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  last_recalled_at TIMESTAMPTZ,  -- For importance boosting
  expires_at TIMESTAMPTZ,  -- Optional TTL
  
  -- Embedding for semantic search
  embedding vector(1536),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT knowledge_nodes_type_check CHECK (
    node_type IN ('fact', 'event', 'relationship', 'rumor', 'belief', 'memory')
  )
);

CREATE INDEX idx_knowledge_nodes_session ON knowledge_nodes(session_id);
CREATE INDEX idx_knowledge_nodes_actor ON knowledge_nodes(session_id, actor_id);
CREATE INDEX idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_owner ON knowledge_nodes(owner_email);
CREATE INDEX idx_knowledge_nodes_global ON knowledge_nodes(node_type) WHERE session_id IS NULL;
CREATE INDEX idx_knowledge_nodes_embedding ON knowledge_nodes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Knowledge Edges (Relationships between knowledge nodes)
-- ============================================================================

CREATE TABLE knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  
  -- Relationship
  relation TEXT NOT NULL,  -- 'knows', 'contradicts', 'implies', 'caused_by', 'related_to'
  strength REAL DEFAULT 1.0,  -- Edge weight
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_node_id, to_node_id, relation)
);

CREATE INDEX idx_knowledge_edges_from ON knowledge_edges(from_node_id);
CREATE INDEX idx_knowledge_edges_to ON knowledge_edges(to_node_id);
CREATE INDEX idx_knowledge_edges_relation ON knowledge_edges(relation);

-- ============================================================================
-- Views for common queries
-- ============================================================================

-- Actor knowledge view (all knowledge a specific actor has)
CREATE OR REPLACE VIEW actor_knowledge AS
SELECT 
  kn.*,
  s.name as session_name
FROM knowledge_nodes kn
LEFT JOIN sessions s ON kn.session_id = s.id
WHERE kn.actor_id IS NOT NULL;

-- Global knowledge view (world facts not tied to actors)
CREATE OR REPLACE VIEW global_knowledge AS
SELECT 
  kn.*,
  s.name as session_name
FROM knowledge_nodes kn
LEFT JOIN sessions s ON kn.session_id = s.id
WHERE kn.actor_id IS NULL AND kn.session_id IS NULL;

-- Session knowledge view (all knowledge in a session)
CREATE OR REPLACE VIEW session_knowledge AS
SELECT 
  kn.*,
  s.name as session_name
FROM knowledge_nodes kn
JOIN sessions s ON kn.session_id = s.id;
