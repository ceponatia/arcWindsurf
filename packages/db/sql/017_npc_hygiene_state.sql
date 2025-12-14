-- Migration: Add NPC hygiene state table
-- Purpose: Track hygiene decay points and levels per body part for NPCs

-- NPC hygiene state table
-- Stores hygiene state for each body part per NPC in a session
CREATE TABLE IF NOT EXISTS npc_hygiene_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    npc_id TEXT NOT NULL,
    body_part TEXT NOT NULL,
    points REAL NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 4),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each NPC can only have one hygiene state per body part per session
    UNIQUE(session_id, npc_id, body_part)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_npc_hygiene_session_npc 
    ON npc_hygiene_state(session_id, npc_id);

-- Index for finding NPCs by hygiene level (for social interaction effects)
CREATE INDEX IF NOT EXISTS idx_npc_hygiene_level
    ON npc_hygiene_state(session_id, level) WHERE level > 0;

-- Comments for documentation
COMMENT ON TABLE npc_hygiene_state IS 'Tracks hygiene decay for NPC body parts, used for sensory descriptions';
COMMENT ON COLUMN npc_hygiene_state.points IS 'Accumulated decay points (higher = dirtier)';
COMMENT ON COLUMN npc_hygiene_state.level IS 'Computed hygiene level 0-4 (0=clean, 4=extreme)';
COMMENT ON COLUMN npc_hygiene_state.body_part IS 'Body region (feet, armpits, hair, etc.)';
