-- Domain: Entities
-- Migration: 002_entities_schema.sql
-- Description: Entity profiles and instances (Characters, Settings, Items, Personas)

-- Unified entity profiles (Replaces character_profiles + setting_profiles as per refactor plan)
CREATE TABLE IF NOT EXISTS entity_profiles (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,            -- 'character', 'setting', 'item', 'faction'
  name TEXT NOT NULL,
  profile_json JSONB NOT NULL,
  owner_email TEXT NOT NULL DEFAULT 'public',
  visibility TEXT DEFAULT 'public',     -- 'private', 'public', 'unlisted'
  tier TEXT,                            -- For characters: 'major', 'minor', 'background'
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  parent_id TEXT,                       -- For forked/derived entities
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_profiles_type ON entity_profiles(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_profiles_owner ON entity_profiles(owner_email);
CREATE INDEX IF NOT EXISTS idx_entity_profiles_name ON entity_profiles(name);
CREATE INDEX IF NOT EXISTS idx_entity_profiles_tier ON entity_profiles(tier);

-- Character Profiles (001, 024, 030, 032 - kept for backward compatibility if needed, but entity_profiles is preferred)
CREATE TABLE IF NOT EXISTS character_profiles (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  race TEXT,
  alignment TEXT,
  owner_email TEXT,
  visibility TEXT DEFAULT 'private',
  version INTEGER DEFAULT 1,
  parent_id TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Setting Profiles (001, 024, 032)
CREATE TABLE IF NOT EXISTS setting_profiles (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  owner_email TEXT,
  visibility TEXT DEFAULT 'private',
  version INTEGER DEFAULT 1,
  parent_id TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Personas (008, 024)
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  name TEXT NOT NULL,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Personas (008, 024)
CREATE TABLE IF NOT EXISTS session_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  persona_id TEXT NOT NULL REFERENCES personas(id),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_personas_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_personas_owner_session ON session_personas(owner_email, session_id);

-- Character instances (001, 024, 036)
CREATE TABLE IF NOT EXISTS character_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_snapshot JSONB NOT NULL,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_character_instances_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE,
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_character_instances_session ON character_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_character_instances_owner_session ON character_instances(owner_email, session_id);

-- Setting instances (001, 024, 036)
CREATE TABLE IF NOT EXISTS setting_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_snapshot JSONB NOT NULL,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_setting_instances_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE,
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_setting_instances_session ON setting_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_setting_instances_owner_session ON setting_instances(owner_email, session_id);

-- Item Definitions (007)
CREATE TABLE IF NOT EXISTS item_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Item Instances (007, 024, 036)
CREATE TABLE IF NOT EXISTS item_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  definition_id TEXT NOT NULL REFERENCES item_definitions(id),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_item_instances_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_item_instances_owner_session ON item_instances(owner_email, session_id);
