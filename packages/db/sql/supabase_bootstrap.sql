-- Minimal RPG: Supabase bootstrap SQL
--
-- Generated from packages/db/sql/*.sql
-- DO NOT EDIT BY HAND; re-generate via: pnpm -F @minimal-rpg/db db:bootstrap:supabase

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- BEGIN 001_init.sql
-- -----------------------------------------------------------------------------
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  character_template_id TEXT NOT NULL,
  setting_template_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_messages_session_idx ON messages(session_id, idx);

-- Per-NPC transcripts (agent-facing)
CREATE TABLE IF NOT EXISTS npc_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, npc_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_npc_messages_session_npc_idx ON npc_messages(session_id, npc_id, idx);

-- Character instances (per-session snapshots)
CREATE TABLE IF NOT EXISTS character_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_snapshot JSONB NOT NULL,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_character_instances_session ON character_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_character_instances_template ON character_instances(template_id);

-- Setting instances (per-session snapshots)
CREATE TABLE IF NOT EXISTS setting_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_snapshot JSONB NOT NULL,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);
CREATE INDEX IF NOT EXISTS idx_setting_instances_session ON setting_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_setting_instances_template ON setting_instances(template_id);

-- Dynamic character templates
CREATE TABLE IF NOT EXISTS character_profiles (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dynamic setting templates
CREATE TABLE IF NOT EXISTS setting_profiles (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Player persona profiles
CREATE TABLE IF NOT EXISTS persona_profiles (
  id TEXT PRIMARY KEY,
  profile_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- END 001_init.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 002_tags.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- END 002_tags.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 003_instance_overrides.sql
-- -----------------------------------------------------------------------------
-- Add overrides storage for per-instance state diffs
ALTER TABLE IF EXISTS character_instances
  ADD COLUMN IF NOT EXISTS overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS setting_instances
  ADD COLUMN IF NOT EXISTS overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- END 003_instance_overrides.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 004_state_change_log.sql
-- -----------------------------------------------------------------------------
-- Audit log for state changes per turn
CREATE TABLE IF NOT EXISTS state_change_log (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  turn_idx INTEGER,
  patch_count INTEGER NOT NULL,
  modified_paths TEXT[] NOT NULL,
  agent_types TEXT[] NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_change_log_session_created ON state_change_log(session_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- END 004_state_change_log.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 005_session_state_slices.sql
-- -----------------------------------------------------------------------------
-- Per-session state slices for location, inventory, and time
-- These tables store the current mutable baseline for each slice
-- keyed by session. They are intentionally lightweight JSONB blobs
-- so the governor/state-manager can evolve their shapes over time.

CREATE TABLE IF NOT EXISTS session_location_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_location_state_session
  ON session_location_state(session_id);

CREATE TABLE IF NOT EXISTS session_inventory_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_inventory_state_session
  ON session_inventory_state(session_id);

CREATE TABLE IF NOT EXISTS session_time_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_time_state_session
  ON session_time_state(session_id);

-- -----------------------------------------------------------------------------
-- END 005_session_state_slices.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 006_multi_npc_support.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- END 006_multi_npc_support.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 007_items.sql
-- -----------------------------------------------------------------------------
-- Item definitions (template / immutable library items)
CREATE TABLE IF NOT EXISTS item_definitions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  definition_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_definitions_category ON item_definitions(category);
CREATE INDEX IF NOT EXISTS idx_item_definitions_created_at ON item_definitions(created_at DESC);

-- Item instances (per-session copies created when session starts)
CREATE TABLE IF NOT EXISTS item_instances (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL,
  definition_snapshot JSONB NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_item_instances_session ON item_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_item_instances_definition ON item_instances(definition_id);
CREATE INDEX IF NOT EXISTS idx_item_instances_owner ON item_instances(owner_type, owner_id);

-- -----------------------------------------------------------------------------
-- END 007_items.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 008_personas.sql
-- -----------------------------------------------------------------------------
-- Persona profiles (player character templates)
-- These are user-created persona definitions that can be reused across sessions

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  user_id TEXT,  -- optional owner (for multi-user support in the future)
  profile_json JSONB NOT NULL,  -- PersonaProfile data from @minimal-rpg/schemas
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_created_at ON personas(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_personas_updated_at ON personas;
CREATE TRIGGER trigger_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW
  EXECUTE FUNCTION update_personas_updated_at();

-- Session personas (per-session persona instances)
-- Snapshot of persona at session start with session-specific overrides

CREATE TABLE IF NOT EXISTS session_personas (
  session_id TEXT PRIMARY KEY REFERENCES user_sessions(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,  -- reference to personas table (or inline for one-off personas)
  profile_json JSONB NOT NULL,  -- snapshot of PersonaProfile at session start
  overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb,  -- session-specific modifications
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_personas_persona_id ON session_personas(persona_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_session_personas_updated_at ON session_personas;
CREATE TRIGGER trigger_session_personas_updated_at
  BEFORE UPDATE ON session_personas
  FOR EACH ROW
  EXECUTE FUNCTION update_session_personas_updated_at();

-- Add comment documentation
COMMENT ON TABLE personas IS 'Player character templates that can be reused across sessions';
COMMENT ON COLUMN personas.profile_json IS 'PersonaProfile schema: id, name, age, gender, summary, appearance?, body?';
COMMENT ON COLUMN personas.user_id IS 'Optional user ownership for multi-user support';

COMMENT ON TABLE session_personas IS 'Active persona instance for a session with session-specific state';
COMMENT ON COLUMN session_personas.profile_json IS 'Snapshot of persona at session start';
COMMENT ON COLUMN session_personas.overrides_json IS 'Session-specific modifications (appearance changes, equipment, etc.)';

-- -----------------------------------------------------------------------------
-- END 008_personas.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 009_session_history.sql
-- -----------------------------------------------------------------------------
-- Session history with debug data per turn/agent
CREATE TABLE IF NOT EXISTS session_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  turn_idx INTEGER NOT NULL,
  owner_user_id TEXT NULL,
  player_input TEXT NOT NULL,
  context_json JSONB,
  debug_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, turn_idx)
);

CREATE INDEX IF NOT EXISTS idx_session_history_session_turn ON session_history(session_id, turn_idx);

-- -----------------------------------------------------------------------------
-- END 009_session_history.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 010_scene_actions.sql
-- -----------------------------------------------------------------------------
-- Scene Actions: Track recent actions in scenes for multi-action turns
--
-- This table stores actions performed in a scene that can be observed
-- by NPCs and used for action sequencing and interrupt handling.
--
-- Each action has:
-- - A unique ID and timestamp
-- - An actor (player or NPC)
-- - A type (speech, action, thought, observation, etc.)
-- - Content/description
-- - Observable entities (who can perceive this action)
-- - Location context
--
-- Actions are used for:
-- - NPC awareness of recent scene events
-- - Action sequencing with interrupts
-- - Building scene state for multi-NPC coordination

CREATE TABLE IF NOT EXISTS scene_actions (
  -- Identity
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  
  -- Actor (who performed this action)
  actor_id TEXT NOT NULL, -- Player ID or NPC instance ID
  actor_type TEXT NOT NULL CHECK (actor_type IN ('player', 'npc')),
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'speech',
    'action',
    'thought',
    'observation',
    'other'
  )),
  content TEXT NOT NULL, -- Description or content of the action
  
  -- Observability
  observable_by TEXT[] NOT NULL DEFAULT '{}', -- Array of entity IDs who can observe this
  location_id TEXT, -- Location where action occurred
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  turn_number INTEGER, -- Optional turn number for correlation
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for querying actions by session (most common query)
CREATE INDEX IF NOT EXISTS idx_scene_actions_session
  ON scene_actions(session_id, created_at DESC);

-- Index for querying actions by location
CREATE INDEX IF NOT EXISTS idx_scene_actions_location
  ON scene_actions(session_id, location_id, created_at DESC)
  WHERE location_id IS NOT NULL;

-- Index for querying actions by turn
CREATE INDEX IF NOT EXISTS idx_scene_actions_turn
  ON scene_actions(session_id, turn_number)
  WHERE turn_number IS NOT NULL;

-- Comments
COMMENT ON TABLE scene_actions IS 'Actions performed in scenes, observable by NPCs for coordination';
COMMENT ON COLUMN scene_actions.observable_by IS 'Array of entity IDs (player or NPCs) who can observe this action';
COMMENT ON COLUMN scene_actions.metadata IS 'Additional action context (target, requirements, state changes, etc.)';

-- -----------------------------------------------------------------------------
-- END 010_scene_actions.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 011_message_speaker.sql
-- -----------------------------------------------------------------------------
-- Add speaker metadata columns to messages table
-- This enables persisting NPC name and avatar with assistant messages

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS speaker_id TEXT,
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS speaker_profile_pic TEXT;

-- Index for efficient queries by speaker
CREATE INDEX IF NOT EXISTS idx_messages_speaker_id ON messages(speaker_id);

COMMENT ON COLUMN messages.speaker_id IS 'Character template ID of the NPC who spoke';
COMMENT ON COLUMN messages.speaker_name IS 'Display name of the speaker at time of message';
COMMENT ON COLUMN messages.speaker_profile_pic IS 'Profile picture URL of the speaker at time of message';

-- -----------------------------------------------------------------------------
-- END 011_message_speaker.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 012_npc_location_state.sql
-- -----------------------------------------------------------------------------
-- NPC Location State persistence for schedule resolution and lazy simulation
--
-- This migration adds tables to track where NPCs are, what they're doing,
-- and cache their simulation state for performance. Enables the location
-- persistence layer described in dev-docs/31-npc-simulation-and-performance.md
-- and dev-docs/32-npc-encounters-and-occupancy.md.

-- =============================================================================
-- Session NPC Location State
-- =============================================================================
-- Tracks the current location and activity of each NPC in a session.
-- This is the primary state object for NPC whereabouts.

CREATE TABLE IF NOT EXISTS session_npc_location_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  
  -- Location fields
  location_id TEXT NOT NULL,
  sub_location_id TEXT,
  
  -- Activity (stored as JSONB for flexibility)
  activity_json JSONB NOT NULL,
  
  -- Arrival time (stored as JSONB GameTime)
  arrived_at_json JSONB NOT NULL,
  
  -- Whether the NPC can be interrupted
  interruptible BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Optional reference to the schedule slot that placed them here
  schedule_slot_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each NPC can only have one location state per session
  UNIQUE(session_id, npc_id)
);

-- Index for querying all NPCs in a session
CREATE INDEX IF NOT EXISTS idx_session_npc_location_state_session
  ON session_npc_location_state(session_id);

-- Index for querying NPCs at a specific location
CREATE INDEX IF NOT EXISTS idx_session_npc_location_state_location
  ON session_npc_location_state(session_id, location_id);

-- =============================================================================
-- Session NPC Simulation Cache
-- =============================================================================
-- Caches simulation state for lazy simulation. Stores the last computed state
-- and schedule decisions for the current day. Enables the tiered simulation
-- strategy where major NPCs are eagerly updated and minor NPCs are lazily computed.

CREATE TABLE IF NOT EXISTS session_npc_simulation_cache (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  
  -- Last time this NPC's state was computed (JSONB GameTime)
  last_computed_at_json JSONB NOT NULL,
  
  -- Current computed state (references session_npc_location_state)
  -- Stored as JSONB for flexibility during schema evolution
  current_state_json JSONB NOT NULL,
  
  -- Cached schedule decisions for the current day
  -- Map of slotId -> ResolvedScheduleOption
  day_decisions_json JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each NPC can only have one simulation cache per session
  UNIQUE(session_id, npc_id)
);

-- Index for querying simulation cache by session
CREATE INDEX IF NOT EXISTS idx_session_npc_simulation_cache_session
  ON session_npc_simulation_cache(session_id);

-- =============================================================================
-- Session Location Occupancy Cache
-- =============================================================================
-- Optional: Caches the occupancy state for locations the player has visited.
-- This is a performance optimization - occupancy can be computed on demand
-- from session_npc_location_state if this table is not used.

CREATE TABLE IF NOT EXISTS session_location_occupancy_cache (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  
  -- Full occupancy state (JSONB LocationOccupancy)
  occupancy_json JSONB NOT NULL,
  
  -- When this occupancy was computed (JSONB GameTime)
  computed_at_json JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each location can only have one occupancy cache per session
  UNIQUE(session_id, location_id)
);

-- Index for querying occupancy cache by session
CREATE INDEX IF NOT EXISTS idx_session_location_occupancy_cache_session
  ON session_location_occupancy_cache(session_id);

-- -----------------------------------------------------------------------------
-- END 012_npc_location_state.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 013_session_affinity_state.sql
-- -----------------------------------------------------------------------------
-- Per-session NPC affinity state
-- Stores relationship scores, action history, and milestones
-- between player and each NPC in the session.

CREATE TABLE IF NOT EXISTS session_affinity_state (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  state_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, npc_id)
);

-- Index for efficient session-wide lookups
CREATE INDEX IF NOT EXISTS idx_session_affinity_state_session
  ON session_affinity_state(session_id);

-- Index for per-NPC lookups within a session
CREATE INDEX IF NOT EXISTS idx_session_affinity_state_session_npc
  ON session_affinity_state(session_id, npc_id);

-- -----------------------------------------------------------------------------
-- END 013_session_affinity_state.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 014_player_interest.sql
-- -----------------------------------------------------------------------------
-- Player Interest Score persistence for tier promotion mechanics
--
-- Tracks player interest in each NPC for automatic tier promotion.
-- Interest score determines when background NPCs become minor characters,
-- minor characters become major characters, etc.
--
-- @see dev-docs/30-npc-tiers-and-promotion.md

CREATE TABLE IF NOT EXISTS session_player_interest (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  
  -- Interest score (0-100+)
  score NUMERIC NOT NULL DEFAULT 0,
  
  -- Total interactions ever (affects bleed rate)
  total_interactions INTEGER NOT NULL DEFAULT 0,
  
  -- Turns since last interaction (for bleed calculation)
  turns_since_interaction INTEGER NOT NULL DEFAULT 0,
  
  -- Peak score ever reached (affects bleed rate)
  peak_score NUMERIC NOT NULL DEFAULT 0,
  
  -- Current NPC tier (for tracking promotions)
  current_tier TEXT NOT NULL DEFAULT 'background',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each NPC can only have one interest score per session
  UNIQUE(session_id, npc_id)
);

-- Index for session-wide lookups
CREATE INDEX IF NOT EXISTS idx_session_player_interest_session
  ON session_player_interest(session_id);

-- Index for finding NPCs above promotion threshold
CREATE INDEX IF NOT EXISTS idx_session_player_interest_score
  ON session_player_interest(session_id, score DESC);

-- -----------------------------------------------------------------------------
-- END 014_player_interest.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 015_workspace_drafts.sql
-- -----------------------------------------------------------------------------
-- Session Workspace Drafts persistence
--
-- Stores in-progress session configurations before they are finalized.
-- Allows users to save their work and continue later.
--
-- @see dev-docs/planning/opus-refactor.md - Phase 0.3

CREATE TABLE IF NOT EXISTS session_workspace_drafts (
  id TEXT PRIMARY KEY,
  
  -- User ownership (future: link to users table)
  user_id TEXT NOT NULL DEFAULT 'default',
  
  -- Draft name for identification
  name TEXT,
  
  -- Complete workspace state as JSON
  -- Contains: setting, locations, npcs, player, tags selections
  workspace_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Current active step in the wizard
  current_step TEXT NOT NULL DEFAULT 'setting',
  
  -- Per-step validation state
  -- Keys: step names, Values: { valid: boolean, errors: string[] }
  validation_state JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_session_workspace_drafts_user
  ON session_workspace_drafts(user_id);

-- Index for finding recent drafts
CREATE INDEX IF NOT EXISTS idx_session_workspace_drafts_updated
  ON session_workspace_drafts(updated_at DESC);

-- Auto-cleanup: drafts older than 30 days can be pruned
-- This is handled by the application, but we create an index to support it
CREATE INDEX IF NOT EXISTS idx_session_workspace_drafts_created
  ON session_workspace_drafts(created_at);

-- -----------------------------------------------------------------------------
-- END 015_workspace_drafts.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 016_location_maps.sql
-- -----------------------------------------------------------------------------
-- Location Maps for visual editing
-- Migration: 016_location_maps.sql
--
-- Creates tables for storing location maps that can be:
-- - Edited visually in the Location Builder (React Flow)
-- - Attached to settings
-- - Instantiated per-session with overrides
--
-- The `nodes_json` and `connections_json` fields store the full graph
-- structure as JSONB for flexibility and atomic updates.

-- ============================================================================
-- Location Maps Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  setting_id UUID NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  
  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template vs Instance
  is_template BOOLEAN NOT NULL DEFAULT TRUE,
  source_template_id UUID REFERENCES location_maps(id) ON DELETE SET NULL,
  
  -- Graph data (JSONB for flexibility)
  nodes_json JSONB NOT NULL DEFAULT '[]',
  connections_json JSONB NOT NULL DEFAULT '[]',
  
  -- Default entry point
  default_start_location_id TEXT,
  
  -- Tags for filtering
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for finding maps by setting
CREATE INDEX IF NOT EXISTS idx_location_maps_setting
  ON location_maps(setting_id);

-- Index for finding templates (for prefab/template library)
CREATE INDEX IF NOT EXISTS idx_location_maps_templates
  ON location_maps(is_template, created_at DESC)
  WHERE is_template = TRUE;

-- Index for user's maps
CREATE INDEX IF NOT EXISTS idx_location_maps_user
  ON location_maps(user_id, created_at DESC);

-- ============================================================================
-- Location Prefabs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_prefabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id TEXT NOT NULL DEFAULT 'default',
  
  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'tavern', 'shop', 'house', 'dungeon'
  
  -- Graph data
  nodes_json JSONB NOT NULL DEFAULT '[]',
  connections_json JSONB NOT NULL DEFAULT '[]',
  
  -- Entry points (port IDs that can connect to parent)
  entry_points TEXT[] NOT NULL DEFAULT '{}',
  
  -- Tags for filtering
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for browsing prefabs by category
CREATE INDEX IF NOT EXISTS idx_location_prefabs_category
  ON location_prefabs(category, name);

-- Index for user's prefabs
CREATE INDEX IF NOT EXISTS idx_location_prefabs_user
  ON location_prefabs(user_id, created_at DESC);

-- ============================================================================
-- Session Location Instances
-- ============================================================================

-- When a session is created, we may instantiate a location map with overrides.
-- This table links sessions to their location map instances.

CREATE TABLE IF NOT EXISTS session_location_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  location_map_id UUID NOT NULL REFERENCES location_maps(id) ON DELETE CASCADE,
  
  -- Override data (merged with template)
  overrides_json JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- One location map per session
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_location_maps_session
  ON session_location_maps(session_id);

-- ============================================================================
-- Auto-update timestamps trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_location_maps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_maps_updated_at
  BEFORE UPDATE ON location_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_location_maps_updated_at();

CREATE TRIGGER location_prefabs_updated_at
  BEFORE UPDATE ON location_prefabs
  FOR EACH ROW
  EXECUTE FUNCTION update_location_maps_updated_at();

-- -----------------------------------------------------------------------------
-- END 016_location_maps.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 017_locations_refactor.sql
-- -----------------------------------------------------------------------------
-- Locations Refactor
-- Migration: 017_locations_refactor.sql
--
-- Separates location definitions from prefabs/maps so locations can be:
-- - Reused across multiple prefabs
-- - Individually edited and managed
-- - Templates for quick placement
--
-- New structure:
-- - locations: Individual location definitions (reusable)
-- - location_prefabs: Collections of locations with relationships (entry/exit nodes)
-- - prefab_location_instances: Join table linking prefabs to locations with position data

-- ============================================================================
-- Locations Table - Individual reusable location definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id TEXT NOT NULL DEFAULT 'default',
  
  -- Core fields
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'room', -- 'region', 'building', 'room'
  description TEXT, -- Used by LLM when narrating (not verbatim)
  summary TEXT, -- Brief summary for UI preview
  
  -- Template vs custom
  is_template BOOLEAN NOT NULL DEFAULT FALSE, -- True = built-in/template location
  
  -- Tags for filtering and theming
  tags TEXT[] DEFAULT '{}',
  
  -- Extended properties (capacity, atmosphere, etc.)
  properties JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_user
  ON locations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_locations_type
  ON locations(type);

CREATE INDEX IF NOT EXISTS idx_locations_templates
  ON locations(is_template, type)
  WHERE is_template = TRUE;

-- ============================================================================
-- Prefab Location Instances - Locations placed in a prefab with position data
-- ============================================================================

CREATE TABLE IF NOT EXISTS prefab_location_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Visual position in editor (0-1 normalized coordinates)
  position_x FLOAT NOT NULL DEFAULT 0.5,
  position_y FLOAT NOT NULL DEFAULT 0.5,
  
  -- Hierarchy within the prefab
  parent_instance_id UUID REFERENCES prefab_location_instances(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  
  -- Named ports/exits for this instance
  ports JSONB DEFAULT '[]',
  
  -- Instance-specific overrides (merged with location properties)
  overrides JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(prefab_id, location_id) -- Each location can only appear once per prefab for now
);

CREATE INDEX IF NOT EXISTS idx_prefab_location_instances_prefab
  ON prefab_location_instances(prefab_id);

CREATE INDEX IF NOT EXISTS idx_prefab_location_instances_location
  ON prefab_location_instances(location_id);

-- ============================================================================
-- Prefab Connections - Links between location instances in a prefab
-- ============================================================================

CREATE TABLE IF NOT EXISTS prefab_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Prefab this connection belongs to
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  
  -- Source and target instances
  from_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  from_port_id TEXT NOT NULL DEFAULT 'default',
  to_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  to_port_id TEXT NOT NULL DEFAULT 'default',
  
  -- Connection properties
  direction TEXT NOT NULL DEFAULT 'horizontal', -- 'horizontal' (east/west, north/south) or 'vertical' (up/down)
  bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  travel_minutes INTEGER,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  lock_reason TEXT,
  label TEXT, -- Display label on the connection
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(prefab_id, from_instance_id, from_port_id, to_instance_id, to_port_id)
);

CREATE INDEX IF NOT EXISTS idx_prefab_connections_prefab
  ON prefab_connections(prefab_id);

-- ============================================================================
-- Prefab Entry/Exit Points - Special nodes marking prefab boundaries
-- ============================================================================

CREATE TABLE IF NOT EXISTS prefab_entry_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Prefab this entry point belongs to
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  
  -- The location instance this entry point connects to
  target_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  target_port_id TEXT NOT NULL DEFAULT 'default',
  
  -- Entry point metadata
  name TEXT NOT NULL, -- "Main Entrance", "Back Door", etc.
  direction TEXT, -- Which direction this entry comes from
  
  -- Visual position (for the entry node on canvas)
  position_x FLOAT NOT NULL DEFAULT 0.5,
  position_y FLOAT NOT NULL DEFAULT 0.5,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prefab_entry_points_prefab
  ON prefab_entry_points(prefab_id);

-- ============================================================================
-- Update location_prefabs to remove embedded JSON (will migrate data)
-- ============================================================================

-- Add new columns for the refactored structure
ALTER TABLE location_prefabs 
  ADD COLUMN IF NOT EXISTS migrated BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- Auto-update timestamps trigger for new tables
-- ============================================================================

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_location_maps_updated_at();

-- ============================================================================
-- Seed some template locations
-- ============================================================================

INSERT INTO locations (id, user_id, name, type, description, is_template, tags, properties)
VALUES
  -- Room templates
  (gen_random_uuid(), 'system', 'Common Room', 'room', 
   'A large open space where people gather to eat, drink, and socialize. The atmosphere is warm and inviting.',
   TRUE, ARRAY['tavern', 'social'], '{"capacity": 30}'),
  
  (gen_random_uuid(), 'system', 'Kitchen', 'room',
   'A busy kitchen filled with the sounds and smells of cooking. Pots bubble, knives chop, and orders are called out.',
   TRUE, ARRAY['tavern', 'work'], '{"capacity": 5}'),
  
  (gen_random_uuid(), 'system', 'Guest Room', 'room',
   'A modest but comfortable room with a bed, small desk, and washbasin. A window lets in natural light.',
   TRUE, ARRAY['tavern', 'private', 'rest'], '{"capacity": 2}'),
  
  (gen_random_uuid(), 'system', 'Storage Room', 'room',
   'A cluttered space filled with crates, barrels, and various supplies. Dusty and dimly lit.',
   TRUE, ARRAY['utility', 'storage'], '{"capacity": 2}'),
  
  (gen_random_uuid(), 'system', 'Entryway', 'room',
   'The entrance area with a welcoming atmosphere. A coat rack and small bench sit near the door.',
   TRUE, ARRAY['entrance', 'transition'], '{"capacity": 5}'),
  
  -- Building templates  
  (gen_random_uuid(), 'system', 'Tavern', 'building',
   'A sturdy wooden building with warm light spilling from its windows. The sign creaks gently in the wind.',
   TRUE, ARRAY['tavern', 'social', 'commercial'], '{"floors": 2}'),
  
  (gen_random_uuid(), 'system', 'Shop', 'building',
   'A commercial establishment with a display window and inviting storefront.',
   TRUE, ARRAY['shop', 'commercial'], '{"floors": 1}'),
  
  (gen_random_uuid(), 'system', 'House', 'building',
   'A residential dwelling, modest but well-maintained.',
   TRUE, ARRAY['residential', 'private'], '{"floors": 2}'),
  
  -- Region templates
  (gen_random_uuid(), 'system', 'Town Square', 'region',
   'The heart of the settlement where main roads converge. A central fountain or monument marks the space.',
   TRUE, ARRAY['outdoor', 'public', 'central'], '{}'),
  
  (gen_random_uuid(), 'system', 'Market District', 'region',
   'A bustling area filled with stalls, shops, and the constant hum of commerce.',
   TRUE, ARRAY['outdoor', 'commercial', 'busy'], '{}')

ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- END 017_locations_refactor.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 017_npc_hygiene_state.sql
-- -----------------------------------------------------------------------------
-- Migration: Add NPC hygiene state table
-- Purpose: Track hygiene decay points and levels per body part for NPCs

-- NPC hygiene state table
-- Stores hygiene state for each body part per NPC in a session
CREATE TABLE IF NOT EXISTS npc_hygiene_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
    npc_id TEXT NOT NULL,
    body_part TEXT NOT NULL,
    points REAL NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 4),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each NPC can only have one hygiene state per body part per session
    UNIQUE(session_id, npc_id, body_part)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_npc_hygiene_session_npc 
    ON npc_hygiene_state(session_id, npc_id);

-- Index for finding NPCs by hygiene level (for social interaction effects)
CREATE INDEX IF NOT EXISTS idx_npc_hygiene_level
    ON npc_hygiene_state(session_id, level) WHERE level > 0;

-- Comments for documentation
COMMENT ON TABLE npc_hygiene_state IS 'Tracks hygiene decay for NPC body parts, used for sensory descriptions';
COMMENT ON COLUMN npc_hygiene_state.points IS 'Accumulated decay points (higher = dirtier)';
COMMENT ON COLUMN npc_hygiene_state.level IS 'Computed hygiene level 0-4 (0=clean, 4=extreme)';
COMMENT ON COLUMN npc_hygiene_state.body_part IS 'Body region (feet, armpits, hair, etc.)';

-- -----------------------------------------------------------------------------
-- END 017_npc_hygiene_state.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 018_schedule_templates.sql
-- -----------------------------------------------------------------------------
-- Migration 018: Schedule Templates
-- Stores reusable schedule templates for NPC daily routines.
-- Templates use placeholder location IDs (prefixed with $) that are resolved
-- when applying the template to a specific NPC in a session.

CREATE TABLE IF NOT EXISTS schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- JSON blob containing the full template structure including slots, default slot, and overrides
    template_data JSONB NOT NULL,
    -- Required placeholders that must be provided when applying this template
    required_placeholders TEXT[] NOT NULL DEFAULT '{}',
    -- Whether this is a built-in system template (cannot be deleted)
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient name lookup
CREATE INDEX IF NOT EXISTS idx_schedule_templates_name ON schedule_templates(name);

-- Index for system vs user templates
CREATE INDEX IF NOT EXISTS idx_schedule_templates_is_system ON schedule_templates(is_system);

-- NPC schedule instances - resolved schedules for specific NPCs in sessions
CREATE TABLE IF NOT EXISTS npc_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
    npc_id VARCHAR(100) NOT NULL,
    -- Optional reference to the template used to generate this schedule
    template_id UUID REFERENCES schedule_templates(id) ON DELETE SET NULL,
    -- The resolved schedule with actual location IDs
    schedule_data JSONB NOT NULL,
    -- Map of placeholder key to resolved location ID (for reference)
    placeholder_mappings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Each NPC can only have one schedule per session
    UNIQUE(session_id, npc_id)
);

-- Index for efficient session lookup
CREATE INDEX IF NOT EXISTS idx_npc_schedules_session ON npc_schedules(session_id);

-- Index for NPC lookup within a session
CREATE INDEX IF NOT EXISTS idx_npc_schedules_npc ON npc_schedules(session_id, npc_id);

-- Update trigger for schedule_templates
CREATE OR REPLACE FUNCTION update_schedule_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_templates_update_timestamp
    BEFORE UPDATE ON schedule_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_templates_timestamp();

-- Update trigger for npc_schedules
CREATE OR REPLACE FUNCTION update_npc_schedules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER npc_schedules_update_timestamp
    BEFORE UPDATE ON npc_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_npc_schedules_timestamp();

-- Seed built-in schedule templates from the schema defaults
-- These match the templates in packages/schemas/src/schedule/defaults.ts
INSERT INTO schedule_templates (id, name, description, template_data, required_placeholders, is_system)
VALUES
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Shopkeeper',
    'Standard shopkeeper schedule with regular business hours',
    '{
        "id": "template-shopkeeper",
        "name": "Shopkeeper",
        "slots": [
            {"id": "shop-morning", "startTime": {"hour": 8, "minute": 0}, "endTime": {"hour": 12, "minute": 0}, "destination": {"type": "fixed", "locationId": "$workLocation"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "shop-lunch", "startTime": {"hour": 12, "minute": 0}, "endTime": {"hour": 13, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "shop-afternoon", "startTime": {"hour": 13, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "fixed", "locationId": "$workLocation"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "shop-evening", "startTime": {"hour": 18, "minute": 0}, "endTime": {"hour": 21, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "shop-sleep", "startTime": {"hour": 21, "minute": 0}, "endTime": {"hour": 8, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['workLocation', 'homeLocation'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'Guard',
    'Guard schedule with day shift and patrol duties',
    '{
        "id": "template-guard",
        "name": "Guard",
        "slots": [
            {"id": "guard-morning-duty", "startTime": {"hour": 6, "minute": 0}, "endTime": {"hour": 12, "minute": 0}, "destination": {"type": "fixed", "locationId": "$guardPost"}, "activity": {"action": "guarding", "description": "Standing watch", "engagementLevel": "focused"}},
            {"id": "guard-lunch", "startTime": {"hour": 12, "minute": 0}, "endTime": {"hour": 13, "minute": 0}, "destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "guard-afternoon-duty", "startTime": {"hour": 13, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "fixed", "locationId": "$guardPost"}, "activity": {"action": "guarding", "description": "Standing watch", "engagementLevel": "focused"}},
            {"id": "guard-evening", "startTime": {"hour": 18, "minute": 0}, "endTime": {"hour": 22, "minute": 0}, "destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "guard-sleep", "startTime": {"hour": 22, "minute": 0}, "endTime": {"hour": 6, "minute": 0}, "destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$barracks"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['guardPost', 'barracks'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d481',
    'Tavern Keeper',
    'Tavern keeper with extended evening hours',
    '{
        "id": "template-tavern-keeper",
        "name": "Tavern Keeper",
        "slots": [
            {"id": "tavern-morning", "startTime": {"hour": 10, "minute": 0}, "endTime": {"hour": 14, "minute": 0}, "destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "tavern-break", "startTime": {"hour": 14, "minute": 0}, "endTime": {"hour": 16, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "tavern-evening", "startTime": {"hour": 16, "minute": 0}, "endTime": {"hour": 24, "minute": 0}, "destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "tavern-late", "startTime": {"hour": 0, "minute": 0}, "endTime": {"hour": 2, "minute": 0}, "destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}},
            {"id": "tavern-sleep", "startTime": {"hour": 2, "minute": 0}, "endTime": {"hour": 10, "minute": 0}, "destination": {"type": "fixed", "locationId": "$homeLocation"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$tavern"}, "activity": {"action": "working", "description": "Working diligently", "engagementLevel": "focused"}}
    }',
    ARRAY['tavern', 'homeLocation'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d482',
    'Noble',
    'Leisurely noble schedule with social engagements',
    '{
        "id": "template-noble",
        "name": "Noble",
        "slots": [
            {"id": "noble-wake", "startTime": {"hour": 9, "minute": 0}, "endTime": {"hour": 10, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "idle", "description": "Just waking up", "engagementLevel": "idle"}},
            {"id": "noble-breakfast", "startTime": {"hour": 10, "minute": 0}, "endTime": {"hour": 11, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "noble-study", "startTime": {"hour": 11, "minute": 0}, "endTime": {"hour": 13, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "studying", "description": "Reading or studying", "engagementLevel": "focused"}},
            {"id": "noble-lunch", "startTime": {"hour": 13, "minute": 0}, "endTime": {"hour": 14, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "noble-social", "startTime": {"hour": 15, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "fixed", "locationId": "$socialVenue"}, "activity": {"action": "socializing", "description": "Chatting with others", "engagementLevel": "casual"}},
            {"id": "noble-dinner", "startTime": {"hour": 19, "minute": 0}, "endTime": {"hour": 21, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "noble-evening", "startTime": {"hour": 21, "minute": 0}, "endTime": {"hour": 23, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "noble-sleep", "startTime": {"hour": 23, "minute": 0}, "endTime": {"hour": 9, "minute": 0}, "destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$manor"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['manor', 'socialVenue'],
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d483',
    'Wanderer',
    'Traveler visiting various locations throughout the day',
    '{
        "id": "template-wanderer",
        "name": "Wanderer",
        "slots": [
            {"id": "wanderer-sleep", "startTime": {"hour": 22, "minute": 0}, "endTime": {"hour": 7, "minute": 0}, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "sleeping", "description": "Sleeping peacefully", "engagementLevel": "absorbed"}},
            {"id": "wanderer-morning", "startTime": {"hour": 7, "minute": 0}, "endTime": {"hour": 9, "minute": 0}, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "eating", "description": "Having a meal", "engagementLevel": "casual"}},
            {"id": "wanderer-market", "startTime": {"hour": 9, "minute": 0}, "endTime": {"hour": 14, "minute": 0}, "destination": {"type": "fixed", "locationId": "$market"}, "activity": {"action": "shopping", "description": "Browsing or buying", "engagementLevel": "casual"}},
            {"id": "wanderer-afternoon", "startTime": {"hour": 14, "minute": 0}, "endTime": {"hour": 18, "minute": 0}, "destination": {"type": "choice", "options": [{"weight": 7, "destination": {"type": "fixed", "locationId": "$market"}, "activity": {"action": "socializing", "description": "Chatting with others", "engagementLevel": "casual"}}, {"weight": 5, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}], "fallback": {"type": "fixed", "locationId": "$inn"}}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}},
            {"id": "wanderer-evening", "startTime": {"hour": 18, "minute": 0}, "endTime": {"hour": 22, "minute": 0}, "destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "drinking", "description": "Enjoying a drink", "engagementLevel": "casual"}}
        ],
        "defaultSlot": {"destination": {"type": "fixed", "locationId": "$inn"}, "activity": {"action": "relaxing", "description": "Taking it easy", "engagementLevel": "casual"}}
    }',
    ARRAY['inn', 'market'],
    TRUE
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- END 018_schedule_templates.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 019_user_accounts.sql
-- -----------------------------------------------------------------------------
-- Migration: 019_user_accounts
-- Description: Minimal user accounts table for storing preferences
-- Note: Full authentication/authorization not implemented yet

-- User accounts table (minimal for preferences)
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifier (for now just a string, can be email/oauth later)
  identifier TEXT NOT NULL UNIQUE,
  
  -- Display name (optional)
  display_name TEXT,
  
  -- User preferences stored as JSONB
  -- Structure: { workspaceMode: 'wizard' | 'compact', ... }
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick identifier lookup
CREATE INDEX IF NOT EXISTS idx_user_accounts_identifier ON user_accounts(identifier);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_accounts_updated_at ON user_accounts;
CREATE TRIGGER trigger_user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_accounts_updated_at();

-- Create default user for single-user mode
INSERT INTO user_accounts (identifier, display_name, preferences)
VALUES ('default', 'Default User', '{"workspaceMode": "wizard"}'::jsonb)
ON CONFLICT (identifier) DO NOTHING;

-- -----------------------------------------------------------------------------
-- END 019_user_accounts.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 020_location_maps_setting_id_text.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- END 020_location_maps_setting_id_text.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 021_tool_call_history.sql
-- -----------------------------------------------------------------------------
-- Tool call history for preserving tool usage context across turns
-- This helps the LLM maintain tool calling patterns in long conversations

CREATE TABLE IF NOT EXISTS tool_call_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  turn_idx INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_args JSONB NOT NULL,
  tool_result JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for retrieving recent tool calls by session
CREATE INDEX IF NOT EXISTS idx_tool_call_history_session_turn 
  ON tool_call_history(session_id, turn_idx DESC);

-- Index for analyzing which tools are used most
CREATE INDEX IF NOT EXISTS idx_tool_call_history_tool_name 
  ON tool_call_history(tool_name);

-- Conversation summary storage for long sessions
-- Stores LLM-generated or structured summaries including tool usage patterns
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'tool_usage', 'npc_specific'
  npc_id TEXT, -- NULL for general summaries
  summary_text TEXT NOT NULL,
  covers_up_to_turn INTEGER NOT NULL,
  tool_usage_hints TEXT[], -- e.g., ['npc_dialogue for Taylor interactions', 'get_sensory_detail for smell/touch']
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for session/type/npc combination (handles NULL npc_id correctly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_summaries_unique 
  ON conversation_summaries(session_id, summary_type, COALESCE(npc_id, ''));

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session 
  ON conversation_summaries(session_id);

-- -----------------------------------------------------------------------------
-- END 021_tool_call_history.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 022_user_accounts_roles.sql
-- -----------------------------------------------------------------------------
-- Migration: 022_user_accounts_roles
-- Description: Add roles + auth fields to user_accounts for future Supabase integration.

-- Add role + auth-related columns
ALTER TABLE user_accounts
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Indexes for role checks and future auth lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_supabase_user_id_unique
  ON user_accounts(supabase_user_id)
  WHERE supabase_user_id IS NOT NULL;

-- Ensure an admin user exists (password_hash is set by application code)
INSERT INTO user_accounts (identifier, display_name, preferences, role, auth_provider)
VALUES ('admin', 'Admin', '{}'::jsonb, 'admin', 'local')
ON CONFLICT (identifier) DO UPDATE
  SET role = EXCLUDED.role;

-- -----------------------------------------------------------------------------
-- END 022_user_accounts_roles.sql
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BEGIN 023_extensions.sql
-- -----------------------------------------------------------------------------
-- Required extensions used by the schema.
--
-- Supabase note: you can also enable these in the dashboard (Database -> Extensions).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- END 023_extensions.sql
-- -----------------------------------------------------------------------------

