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

