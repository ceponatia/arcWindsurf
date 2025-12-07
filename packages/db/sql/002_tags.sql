-- ============================================================================
-- Enhanced Prompt Tags (Global definitions)
-- ============================================================================
-- Drop old tables to recreate with enhanced schema
DROP TABLE IF EXISTS session_tag_instances CASCADE;
DROP TABLE IF EXISTS prompt_tags CASCADE;

-- Prompt Tags with enhanced fields for targeting, activation, and versioning
CREATE TABLE IF NOT EXISTS prompt_tags (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT 'admin',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public', 'unlisted')),
  name TEXT NOT NULL,
  short_description TEXT,
  category TEXT NOT NULL DEFAULT 'style' CHECK (category IN ('style', 'mechanic', 'content', 'world', 'behavior', 'trigger', 'meta')),
  prompt_text TEXT NOT NULL,
  activation_mode TEXT NOT NULL DEFAULT 'always' CHECK (activation_mode IN ('always', 'conditional')),
  target_type TEXT NOT NULL DEFAULT 'session' CHECK (target_type IN ('session', 'character', 'npc', 'player', 'location', 'setting')),
  triggers JSONB NOT NULL DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('override', 'high', 'normal', 'low', 'fallback')),
  composition_mode TEXT NOT NULL DEFAULT 'append' CHECK (composition_mode IN ('append', 'prepend', 'replace', 'merge')),
  conflicts_with TEXT[] DEFAULT NULL,
  requires TEXT[] DEFAULT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  changelog TEXT,
  is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner, name)
);

CREATE INDEX IF NOT EXISTS idx_prompt_tags_owner ON prompt_tags(owner);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_category ON prompt_tags(category);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_visibility ON prompt_tags(visibility);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_activation_mode ON prompt_tags(activation_mode);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_is_built_in ON prompt_tags(is_built_in);

-- ============================================================================
-- Session Tag Bindings (Junction table for session-entity binding)
-- ============================================================================
-- Replaces session_tag_instances with a proper junction table
CREATE TABLE IF NOT EXISTS session_tag_bindings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL DEFAULT 'session' CHECK (target_type IN ('session', 'character', 'npc', 'player', 'location', 'setting')),
  target_entity_id TEXT, -- NULL = applies to all entities of target_type
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, tag_id, target_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_session_tag_bindings_session ON session_tag_bindings(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tag_bindings_tag ON session_tag_bindings(tag_id);
CREATE INDEX IF NOT EXISTS idx_session_tag_bindings_enabled ON session_tag_bindings(enabled);
CREATE INDEX IF NOT EXISTS idx_session_tag_bindings_target ON session_tag_bindings(target_type, target_entity_id);
