-- Add NPCs snapshot column for projections
--
-- This aligns the DB schema with the projections snapshot store, which persists
-- the NPC projection state into session_projections.npcs.

ALTER TABLE session_projections
ADD COLUMN IF NOT EXISTS npcs JSONB NOT NULL DEFAULT '{}';
