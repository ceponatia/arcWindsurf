-- Add race and alignment generated columns to character_profiles
ALTER TABLE character_profiles
ADD COLUMN IF NOT EXISTS race TEXT GENERATED ALWAYS AS (profile_json->>'race') STORED,
ADD COLUMN IF NOT EXISTS alignment TEXT GENERATED ALWAYS AS (profile_json->>'alignment') STORED;

CREATE INDEX IF NOT EXISTS idx_character_profiles_race ON character_profiles(race);
CREATE INDEX IF NOT EXISTS idx_character_profiles_alignment ON character_profiles(alignment);
