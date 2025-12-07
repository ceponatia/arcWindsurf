-- Add overrides storage for per-instance state diffs
ALTER TABLE IF EXISTS character_instances
  ADD COLUMN IF NOT EXISTS overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS setting_instances
  ADD COLUMN IF NOT EXISTS overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb;
