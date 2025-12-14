-- Player Interest Score persistence for tier promotion mechanics
--
-- Tracks player interest in each NPC for automatic tier promotion.
-- Interest score determines when background NPCs become minor characters,
-- minor characters become major characters, etc.
--
-- @see dev-docs/30-npc-tiers-and-promotion.md

CREATE TABLE IF NOT EXISTS session_player_interest (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  
  -- Interest score (0-100+)
  score NUMERIC NOT NULL DEFAULT 0,
  
  -- Total interactions ever (affects bleed rate)
  total_interactions INTEGER NOT NULL DEFAULT 0,
  
  -- Turns since last interaction (for bleed calculation)
  turns_since_interaction INTEGER NOT NULL DEFAULT 0,
  
  -- Peak score ever reached (affects bleed rate)
  peak_score NUMERIC NOT NULL DEFAULT 0,
  
  -- Current NPC tier (for tracking promotions)
  current_tier TEXT NOT NULL DEFAULT 'background',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each NPC can only have one interest score per session
  UNIQUE(session_id, npc_id)
);

-- Index for session-wide lookups
CREATE INDEX IF NOT EXISTS idx_session_player_interest_session
  ON session_player_interest(session_id);

-- Index for finding NPCs above promotion threshold
CREATE INDEX IF NOT EXISTS idx_session_player_interest_score
  ON session_player_interest(session_id, score DESC);
