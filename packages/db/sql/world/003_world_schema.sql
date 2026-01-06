-- Domain: World
-- Migration: 003_world_schema.sql
-- Description: Locations, maps, and world state

-- Location Maps (016)
CREATE TABLE IF NOT EXISTS location_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  setting_id TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Location Prefabs (016)
CREATE TABLE IF NOT EXISTS location_prefabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'building',
  data JSONB NOT NULL DEFAULT '{}',
  migrated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Locations (017, 032)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  owner_email TEXT NOT NULL DEFAULT 'system',
  setting_id TEXT,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_user ON locations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
CREATE INDEX IF NOT EXISTS idx_locations_templates ON locations(is_template, type) WHERE is_template = TRUE;

-- Prefab Location Instances (017)
CREATE TABLE IF NOT EXISTS prefab_location_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  position_x FLOAT NOT NULL DEFAULT 0.5,
  position_y FLOAT NOT NULL DEFAULT 0.5,
  parent_instance_id UUID REFERENCES prefab_location_instances(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  ports JSONB DEFAULT '[]',
  overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prefab_id, location_id)
);

-- Prefab Connections (017)
CREATE TABLE IF NOT EXISTS prefab_connections (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prefab_id, from_instance_id, from_port_id, to_instance_id, to_port_id)
);

-- Prefab Entry/Exit Points (017)
CREATE TABLE IF NOT EXISTS prefab_entry_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefab_id UUID NOT NULL REFERENCES location_prefabs(id) ON DELETE CASCADE,
  target_instance_id UUID NOT NULL REFERENCES prefab_location_instances(id) ON DELETE CASCADE,
  target_port_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  direction TEXT,
  position_x FLOAT NOT NULL DEFAULT 0.5,
  position_y FLOAT NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Location Maps (016)
CREATE TABLE IF NOT EXISTS session_location_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES location_maps(id),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Location State (005, 024)
CREATE TABLE IF NOT EXISTS session_location_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  location_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_location_state_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);

-- Session Inventory State (005, 024)
CREATE TABLE IF NOT EXISTS session_inventory_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_inventory_state_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);

-- Session Time State (005, 024)
CREATE TABLE IF NOT EXISTS session_time_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  current_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_time_state_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);

-- Session NPC Location State (012, 024, 036)
CREATE TABLE IF NOT EXISTS session_npc_location_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_npc_location_state_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_npc_location_state_owner_session ON session_npc_location_state(owner_email, session_id);

-- NPC Hygiene State (017b, 024, 025, 026)
CREATE TABLE IF NOT EXISTS npc_hygiene_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_npc_hygiene_state_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_npc_hygiene_state_owner_session_npc ON npc_hygiene_state(owner_email, session_id, npc_id);

-- Session Affinity State (013, 024)
CREATE TABLE IF NOT EXISTS session_affinity_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  affinity_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_affinity_state_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_affinity_state_owner_session ON session_affinity_state(owner_email, session_id);

-- Session Player Interest (014, 024)
CREATE TABLE IF NOT EXISTS session_player_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  interest_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_player_interest_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_player_interest_owner_session ON session_player_interest(owner_email, session_id);

-- Schedule Templates (018)
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NPC Schedules (018, 024)
CREATE TABLE IF NOT EXISTS npc_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_npc_schedules_session_owner FOREIGN KEY (session_id, owner_email) REFERENCES user_sessions(id, owner_email) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_npc_schedules_owner_session ON npc_schedules(owner_email, session_id);
