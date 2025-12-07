-- Multi-NPC support: annotate character instances with role/label
--
-- This migration adds minimal columns needed to distinguish the
-- primary player character instance from supporting NPC instances
-- within a session, without changing existing behavior.
--
-- Existing rows default to role = 'primary'.

ALTER TABLE IF EXISTS character_instances
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'primary';

ALTER TABLE IF EXISTS character_instances
  ADD COLUMN IF NOT EXISTS label TEXT;

-- Helpful index for querying instances by session + role
CREATE INDEX IF NOT EXISTS idx_character_instances_session_role
  ON character_instances(session_id, role);
