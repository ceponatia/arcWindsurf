-- Domain: Factions
-- Migration: 007_factions.sql
-- Description: Faction relationships and actor reputations
-- Created: 2026-01-30

-- ============================================================================
-- Faction Relationships
-- ============================================================================

CREATE TABLE faction_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faction_a_id UUID NOT NULL REFERENCES entity_profiles(id) ON DELETE CASCADE,
  faction_b_id UUID NOT NULL REFERENCES entity_profiles(id) ON DELETE CASCADE,
  relationship INTEGER NOT NULL DEFAULT 0,
  relationship_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT faction_relationships_unique UNIQUE (faction_a_id, faction_b_id),
  CONSTRAINT faction_relationships_no_self CHECK (faction_a_id != faction_b_id)
);

CREATE INDEX idx_faction_relationships_a ON faction_relationships(faction_a_id);
CREATE INDEX idx_faction_relationships_b ON faction_relationships(faction_b_id);

-- ============================================================================
-- Actor Faction Reputation (Session Scoped)
-- ============================================================================

CREATE TABLE actor_faction_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  faction_id UUID NOT NULL REFERENCES entity_profiles(id) ON DELETE CASCADE,
  reputation INTEGER NOT NULL DEFAULT 0,
  reputation_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT actor_faction_reputation_unique UNIQUE (session_id, actor_id, faction_id)
);

CREATE INDEX idx_actor_faction_rep_session ON actor_faction_reputation(session_id);
CREATE INDEX idx_actor_faction_rep_actor ON actor_faction_reputation(actor_id);
CREATE INDEX idx_actor_faction_rep_faction ON actor_faction_reputation(faction_id);
