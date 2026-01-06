-- Domain: Meta
-- Migration: 005_meta_schema.sql
-- Description: Event Sourcing, Knowledge Graph, and Snapshots

-- Game Events (Append-only log) (033)
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  sequence BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  caused_by_event_id UUID,
  turn_idx INTEGER,
  agent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_game_events_session_seq ON game_events(session_id, sequence);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_owner ON game_events(owner_email, session_id);

-- Session Snapshots (Periodic state captures) (033)
CREATE TABLE IF NOT EXISTS session_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  at_sequence BIGINT NOT NULL,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, at_sequence)
);
CREATE INDEX IF NOT EXISTS idx_session_snapshots_session_seq ON session_snapshots(session_id, at_sequence DESC);

-- Knowledge Nodes (Facts, memories, relationships) (034)
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES user_sessions(id) ON DELETE CASCADE, -- NULL = global knowledge
  owner_email TEXT NOT NULL,
  npc_id TEXT,                          -- Which NPC knows this (NULL = world fact)
  node_type TEXT NOT NULL,              -- 'fact', 'event', 'relationship', 'rumor', 'belief'
  content TEXT NOT NULL,
  summary TEXT,                         -- Short version for prompts
  confidence REAL DEFAULT 1.0,          -- How certain (rumors < facts)
  importance REAL DEFAULT 0.5,          -- Relevance weight
  decay_rate REAL DEFAULT 0.0,          -- Memory fade per day
  source_type TEXT,                     -- 'witnessed', 'heard', 'inferred', 'told'
  source_entity_id TEXT,                -- Who told them
  source_event_id UUID REFERENCES game_events(id),
  learned_at TIMESTAMPTZ DEFAULT NOW(), -- When acquired
  last_recalled_at TIMESTAMPTZ,         -- For importance boosting
  expires_at TIMESTAMPTZ,               -- Optional TTL
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_session ON knowledge_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_npc ON knowledge_nodes(session_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding ON knowledge_nodes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Knowledge Edges (Relationships between nodes) (034)
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
