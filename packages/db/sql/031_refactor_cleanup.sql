-- Phase 1: Cleanup of unused or redundant tables
-- As per dev-docs/database-migration-refactor.md

-- 1. Drop unused tables
DROP TABLE IF EXISTS persona_profiles CASCADE;
DROP TABLE IF EXISTS state_change_log CASCADE;
DROP TABLE IF EXISTS session_location_occupancy_cache CASCADE;
DROP TABLE IF EXISTS session_npc_simulation_cache CASCADE;
DROP TABLE IF EXISTS session_workspace_drafts CASCADE;

-- Note: Migration numbering fix (017 duplicate) is handled by renaming the file.
