-- Migration: Extend NPC hygiene level range to 0-6
-- Purpose: Support 7 hygiene levels in the hygiene/sensory system.

-- Drop any existing check constraint that restricts npc_hygiene_state.level to <= 4
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'npc_hygiene_state'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%level%'
    AND pg_get_constraintdef(c.oid) LIKE '%<= 4%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE npc_hygiene_state DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Ensure the current constraint matches the new range
ALTER TABLE npc_hygiene_state
  DROP CONSTRAINT IF EXISTS npc_hygiene_state_level_check;

ALTER TABLE npc_hygiene_state
  ADD CONSTRAINT npc_hygiene_state_level_check
  CHECK (level >= 0 AND level <= 6);

-- Update documentation comment
COMMENT ON COLUMN npc_hygiene_state.level IS 'Computed hygiene level 0-6 (0=clean, 6=putrid)';
