-- Domain: Foundation
-- Migration: 001_foundation.sql
-- Description: Extensions, user accounts, entity profiles, prompt tags, plugins
-- Created: 2026-01-07 (Fresh World Bus schema)

-- ============================================================================
-- Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- User Accounts
-- ============================================================================

CREATE TABLE user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  roles TEXT[] DEFAULT '{player}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_accounts_email ON user_accounts(email);

-- ============================================================================
-- Entity Profiles (Unified templates: characters, settings, items, factions, personas)
-- ============================================================================

CREATE TABLE entity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,  -- 'character', 'setting', 'item', 'faction', 'persona'
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL DEFAULT 'public',
  visibility TEXT DEFAULT 'public',  -- 'public', 'private', 'unlisted'
  tier TEXT,  -- For characters: 'major', 'minor', 'background'
  profile_json JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT entity_profiles_type_check CHECK (
    entity_type IN ('character', 'setting', 'item', 'faction', 'persona')
  )
);

CREATE INDEX idx_entity_profiles_type ON entity_profiles(entity_type);
CREATE INDEX idx_entity_profiles_owner ON entity_profiles(owner_email);
CREATE INDEX idx_entity_profiles_name ON entity_profiles(name);
CREATE INDEX idx_entity_profiles_tier ON entity_profiles(tier) WHERE tier IS NOT NULL;
CREATE INDEX idx_entity_profiles_visibility ON entity_profiles(visibility);
CREATE INDEX idx_entity_profiles_embedding ON entity_profiles 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Prompt Tags (Simplified schema)
-- ============================================================================

CREATE TABLE prompt_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'style',  -- 'style', 'theme', 'mechanic', 'content'
  prompt_text TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_tags_category ON prompt_tags(category);
CREATE INDEX idx_prompt_tags_active ON prompt_tags(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- Plugins
-- ============================================================================

CREATE TABLE plugins (
  id TEXT PRIMARY KEY,  -- e.g., '@arcagentic/plugin-combat'
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  manifest JSONB NOT NULL,  -- {schemas, tools, agents, routes, ui}
  enabled BOOLEAN DEFAULT TRUE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plugins_enabled ON plugins(enabled) WHERE enabled = TRUE;
