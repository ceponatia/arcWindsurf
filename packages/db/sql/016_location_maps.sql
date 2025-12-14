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
