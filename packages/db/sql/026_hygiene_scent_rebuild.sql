-- Migration: Hygiene & Scent Rebuild (Consolidated)
-- Purpose: Normalize npc_hygiene_state levels to the 0-6 range and ensure constraints/comments match the rebuilt hygiene system.

BEGIN;

-- Clamp any existing levels into the valid 0-6 range
UPDATE npc_hygiene_state
SET level = LEAST(GREATEST(level, 0), 6);

-- Drop any existing level check constraints so we can replace with the 0-6 range
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'npc_hygiene_state'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%level%'
  LOOP
    EXECUTE format('ALTER TABLE npc_hygiene_state DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

-- Enforce 7-level hygiene system (0-6)
ALTER TABLE npc_hygiene_state
  ADD CONSTRAINT npc_hygiene_state_level_check
  CHECK (level >= 0 AND level <= 6);

-- Update documentation to reflect the new range
COMMENT ON COLUMN npc_hygiene_state.level IS 'Computed hygiene level 0-6 (0=clean, 6=putrid)';

COMMIT;
