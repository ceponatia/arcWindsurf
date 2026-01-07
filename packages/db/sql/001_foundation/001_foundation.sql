-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- User accounts
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  roles TEXT[] DEFAULT '{player}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unified entity profiles (characters, settings, items, factions, personas)
CREATE TABLE entity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,  -- 'character', 'setting', 'item', 'faction', 'persona'
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL DEFAULT 'public',
  visibility TEXT DEFAULT 'public',
  tier TEXT,  -- For characters: 'major', 'minor', 'background'
  profile_json JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entity_profiles_type ON entity_profiles(entity_type);
CREATE INDEX idx_entity_profiles_owner ON entity_profiles(owner_email);
CREATE INDEX idx_entity_profiles_name ON entity_profiles(name);

-- Prompt tags (simplified)
CREATE TABLE prompt_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'style',
  prompt_text TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plugins
CREATE TABLE plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  manifest JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
