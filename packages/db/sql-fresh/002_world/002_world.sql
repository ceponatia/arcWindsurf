-- Domain: World
-- Migration: 002_world.sql
-- Description: Locations, maps, prefabs, and schedule templates
-- Created: 2026-01-07 (Fresh World Bus schema)

-- ============================================================================
-- Locations (World building blocks)
-- ============================================================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL DEFAULT 'system',
  setting_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'room',  -- 'room', 'area', 'building', 'region', 'world'
  description TEXT,
  summary TEXT,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  properties JSONB DEFAULT '{}',
  atmosphere JSONB DEFAULT '{}',
  capacity INTEGER,
  accessibility TEXT DEFAULT 'open',  -- 'open', 'locked', 'hidden', 'restricted'
  parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_owner ON locations(owner_email);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_setting ON locations(setting_id) WHERE setting_id IS NOT NULL;
CREATE INDEX idx_locations_template ON locations(is_template) WHERE is_template = TRUE;
CREATE INDEX idx_locations_parent ON locations(parent_location_id) WHERE parent_location_id IS NOT NULL;
CREATE INDEX idx_locations_embedding ON locations 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Location Maps (Container for connected locations)
-- ============================================================================

CREATE TABLE location_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL DEFAULT 'system',
  name TEXT NOT NULL,
  description TEXT,
  setting_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  nodes_json JSONB NOT NULL DEFAULT '[]',  -- Array of location node data
  connections_json JSONB NOT NULL DEFAULT '[]',  -- Array of connection data
  default_start_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_location_maps_owner ON location_maps(owner_email);
CREATE INDEX idx_location_maps_setting ON location_maps(setting_id) WHERE setting_id IS NOT NULL;
CREATE INDEX idx_location_maps_template ON location_maps(is_template) WHERE is_template = TRUE;

-- ============================================================================
-- Location Prefabs (Reusable building/area templates)
-- ============================================================================

CREATE TABLE location_prefabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL DEFAULT 'system',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'building',  -- 'building', 'district', 'dungeon', etc.
  description TEXT,
  category TEXT,  -- 'tavern', 'shop', 'residence', 'dungeon', etc.
  nodes_json JSONB NOT NULL DEFAULT '[]',
  connections_json JSONB NOT NULL DEFAULT '[]',
  entry_points TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_location_prefabs_owner ON location_prefabs(owner_email);
CREATE INDEX idx_location_prefabs_type ON location_prefabs(type);
CREATE INDEX idx_location_prefabs_category ON location_prefabs(category) WHERE category IS NOT NULL;

-- ============================================================================
-- Prefab Location Instances (Prefab placed within a map)
-- ============================================================================

CREATE TABLE prefab_location_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  position_x FLOAT NOT NULL DEFAULT 0.5,
  position_y FLOAT NOT NULL DEFAULT 0.5,
  parent_instance_id UUID REFERENCES prefab_location_instances(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  ports JSONB DEFAULT '[]',
  overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prefab_id, location_id)
);

CREATE INDEX idx_prefab_instances_prefab ON prefab_location_instances(prefab_id);
CREATE INDEX idx_prefab_instances_location ON prefab_location_instances(location_id);

-- ============================================================================
-- Prefab Connections (Links between prefab instances)
-- ============================================================================

CREATE TABLE prefab_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  from_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  from_port_id TEXT NOT NULL DEFAULT 'default',
  to_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  to_port_id TEXT NOT NULL DEFAULT 'default',
  direction TEXT NOT NULL DEFAULT 'horizontal',  -- 'horizontal', 'vertical', 'stairs'
  bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  travel_minutes INTEGER,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  lock_reason TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prefab_id, from_instance_id, from_port_id, to_instance_id, to_port_id)
);

CREATE INDEX idx_prefab_connections_prefab ON prefab_connections(prefab_id);
CREATE INDEX idx_prefab_connections_from ON prefab_connections(from_instance_id);
CREATE INDEX idx_prefab_connections_to ON prefab_connections(to_instance_id);

-- ============================================================================
-- Prefab Entry Points (External connection points for prefabs)
-- ============================================================================

CREATE TABLE prefab_entry_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  target_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  target_port_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  direction TEXT,  -- 'north', 'south', 'east', 'west', 'up', 'down'
  position_x FLOAT NOT NULL DEFAULT 0.5,
  position_y FLOAT NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prefab_entry_points_prefab ON prefab_entry_points(prefab_id);

-- ============================================================================
-- Schedule Templates (NPC daily schedule patterns)
-- ============================================================================

CREATE TABLE schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  schedule_json JSONB NOT NULL,  -- Array of {time, activity, location, etc.}
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_templates_name ON schedule_templates(name);
