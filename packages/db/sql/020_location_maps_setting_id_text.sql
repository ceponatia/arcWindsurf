-- Migration: 020_location_maps_setting_id_text.sql
--
-- Changes location_maps.setting_id from UUID to TEXT to match setting_profiles.id
-- which uses text IDs (e.g., 'test-tavern') rather than UUIDs.

-- Drop the index first
DROP INDEX IF EXISTS idx_location_maps_setting;

-- Alter the column type
ALTER TABLE location_maps
  ALTER COLUMN setting_id TYPE TEXT USING setting_id::TEXT;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_location_maps_setting
  ON location_maps(setting_id);
