-- Location definitions
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL DEFAULT 'system',
  setting_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'room',
  description TEXT,
  summary TEXT,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  properties JSONB DEFAULT '{}',
  atmosphere JSONB DEFAULT '{}',
  capacity INTEGER,
  accessibility TEXT DEFAULT 'open',
  parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_owner ON locations(owner_email);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_template ON locations(is_template) WHERE is_template = TRUE;

-- Location maps
CREATE TABLE location_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL DEFAULT 'system',
  name TEXT NOT NULL,
  description TEXT,
  setting_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  nodes_json JSONB NOT NULL DEFAULT '[]',
  connections_json JSONB NOT NULL DEFAULT '[]',
  default_start_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Location prefabs (reusable building templates)
CREATE TABLE location_prefabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL DEFAULT 'system',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'building',
  description TEXT,
  category TEXT,
  nodes_json JSONB NOT NULL DEFAULT '[]',
  connections_json JSONB NOT NULL DEFAULT '[]',
  entry_points TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prefab instances within a map
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

-- Prefab connections
CREATE TABLE prefab_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  from_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  from_port_id TEXT NOT NULL DEFAULT 'default',
  to_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  to_port_id TEXT NOT NULL DEFAULT 'default',
  direction TEXT NOT NULL DEFAULT 'horizontal',
  bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  travel_minutes INTEGER,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  lock_reason TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prefab_id, from_instance_id, from_port_id, to_instance_id, to_port_id)
);

-- Prefab entry/exit points
CREATE TABLE prefab_entry_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  target_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  target_port_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  direction TEXT,
  position_x FLOAT NOT NULL DEFAULT 0.5,
  position_y FLOAT NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schedule templates
CREATE TABLE schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  schedule_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
