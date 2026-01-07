# Fresh Migration Plan: World Bus Clean Slate

> **Status**: Ready to Execute  
> **Created**: 2026-01-07  
> **Purpose**: Remove all legacy tables and create clean World Bus-only schema

## Overview

Since this is a fork with no production data, we'll drop the existing database and create fresh migrations that only include tables required for the World Bus architecture. This eliminates the dual-architecture complexity and technical debt from the legacy Governor-based system.

## Quick Reference

| Metric | Legacy Schema | Fresh Schema |
|--------|--------------|--------------|
| Total Tables | ~40+ | 20 |
| Session Tables | 2 (user_sessions, sessions) | 1 (sessions) |
| Message Tables | 2 (messages, npc_messages) | 0 (use events) |
| State Tables | 8+ (session_*_state) | 2 (actor_states, session_projections) |
| Event Tables | 2 (game_events, events) | 1 (events) |

---

## Strategy: Drop and Rebuild

### Why Fresh Start?

1. **No Data Loss**: Database contains only development/test data
2. **Cleaner Codebase**: Eliminates 007_schema_fixes.sql workarounds
3. **Simpler Maintenance**: Single coherent schema instead of legacy + World Bus
4. **Faster Development**: No need to maintain backward compatibility
5. **Reduced Confusion**: One session table, one event table, one state model

### Execution Steps

```bash
# 1. Stop all services
docker compose down

# 2. Remove database volume
docker volume rm arcwindsurf_pgdata 2>/dev/null || true

# 3. Remove old migration files
rm -rf packages/db/sql/core packages/db/sql/entities packages/db/sql/world \
       packages/db/sql/system packages/db/sql/meta packages/db/sql/fixes

# 4. Create new migration structure
mkdir -p packages/db/sql/{001_foundation,002_world,003_actors}

# 5. Start fresh database
docker compose up -d db

# 6. Run new migrations
pnpm --filter @minimal-rpg/db run db:migrate
```

---

## New Migration Structure

```text
packages/db/sql/
├── 001_foundation/
│   └── 001_foundation.sql      # Extensions, user accounts, base tables
├── 002_world/
│   └── 002_world.sql           # Locations, prefabs, maps, templates
├── 003_actors/
│   └── 003_actors.sql          # Sessions, events, actors, projections
└── 004_knowledge/
    └── 004_knowledge.sql       # Knowledge graph, embeddings
```

---

## Schema Design: Tables to Create

### 001_foundation.sql - Core Infrastructure

| Table | Purpose |
|-------|---------|
| `user_accounts` | User authentication and roles |
| `entity_profiles` | Unified templates (characters, settings, items, factions) |
| `prompt_tags` | Simplified prompt tag definitions |
| `plugins` | Plugin registry |

### 002_world.sql - World Building

| Table | Purpose |
|-------|---------|
| `locations` | Location definitions with hierarchy |
| `location_maps` | Map containers |
| `location_prefabs` | Reusable building templates |
| `prefab_location_instances` | Prefab instantiation within maps |
| `prefab_connections` | Connections between locations |
| `prefab_entry_points` | Entry/exit points for prefabs |
| `schedule_templates` | NPC schedule definitions |

### 003_actors.sql - World Bus Event System

| Table | Purpose |
|-------|---------|
| `sessions` | World Bus sessions (UUID primary key) |
| `events` | Append-only event log |
| `actor_states` | XState actor snapshots |
| `session_projections` | Materialized state (location, inventory, time, npcs) |
| `session_participants` | Multiplayer support |
| `session_plugin_state` | Per-session plugin data |
| `session_location_maps` | Session-to-map linking |

### 004_knowledge.sql - Semantic Memory

| Table | Purpose |
|-------|---------|
| `knowledge_nodes` | Facts, memories, beliefs (with pgvector) |
| `knowledge_edges` | Relationships between knowledge |

---

## Tables Being Removed (Legacy)

These tables existed for the Governor-based turn system and are **no longer needed**:

| Removed Table | Replacement |
|---------------|-------------|
| `user_sessions` | `sessions` (World Bus) |
| `messages` | `events` (SPOKE events) |
| `npc_messages` | `events` (NPC_SPOKE events) |
| `session_history` | `events` + `session_projections` |
| `scene_actions` | `events` |
| `character_instances` | `actor_states` |
| `setting_instances` | `session_projections` |
| `item_instances` | `session_projections.inventory` |
| `session_personas` | `actor_states` |
| `session_location_state` | `session_projections.location` |
| `session_inventory_state` | `session_projections.inventory` |
| `session_time_state` | `session_projections.time` |
| `session_npc_location_state` | `actor_states` (per-NPC) |
| `session_affinity_state` | `actor_states` (per-NPC) |
| `session_player_interest` | `actor_states` (per-NPC) |
| `npc_hygiene_state` | `actor_states` (per-NPC) |
| `npc_schedules` | `actor_states` (per-NPC) |
| `session_tag_bindings` | Simplified to session-level only |
| `game_events` | `events` (World Bus) |
| `session_snapshots` | `actor_states` + `session_projections` |
| `state_change_log` | `events` |
| `session_location_occupancy_cache` | Query `actor_states` directly |
| `session_npc_simulation_cache` | `actor_states` |
| `tool_call_history` | `events` (TOOL_CALL event type) |
| `conversation_summaries` | `knowledge_nodes` |
| `session_workspace_drafts` | Recreate in web package state |
| `character_profiles` | Merged into `entity_profiles` |
| `setting_profiles` | Merged into `entity_profiles` |
| `personas` | Merged into `entity_profiles` |
| `item_definitions` | Merged into `entity_profiles` |

---

## Web Package Refactoring Required

The following features in `@minimal-rpg/web` need refactoring to use World Bus:

### Session Management

| Current | Refactor To |
|---------|-------------|
| `useSession()` fetches from `/sessions/:id` (user_sessions) | Fetch from new `sessions` table via API |
| Session state stored in Zustand | Use `session_projections` + SSE streaming |
| Turn-based `submitTurn()` | Event-based `emit(PLAYER_ACTION)` |

### Character/NPC Display

| Current | Refactor To |
|---------|-------------|
| `character_instances` queries | Query `actor_states` for NPCs in session |
| NPC location from `session_npc_location_state` | Query `actor_states.state.locationId` |
| Affinity from `session_affinity_state` | Query `actor_states.state.affinity` |

### Chat/Messages

| Current | Refactor To |
|---------|-------------|
| Fetch from `messages` table | Subscribe to `events` via SSE |
| `npc_messages` for NPC chat | Events with `type: 'SPOKE'` |
| Turn history from `session_history` | Rebuild from `events` |

### Session Builder

| Current | Refactor To |
|---------|-------------|
| `session_workspace_drafts` table | Local state + `localStorage` |
| Location map selection saves to DB | Create session with map reference |

### Location/Map Builder

| Current | Refactor To |
|---------|-------------|
| Works with `location_prefabs` | Keep as-is (no changes needed) |
| `location_maps` editor | Keep as-is (no changes needed) |

### Tags System

| Current | Refactor To |
|---------|-------------|
| `prompt_tags` with 15+ columns | Simplified schema (id, name, prompt_text, category) |
| `session_tag_bindings` per entity | Session-level tag activation only |

---

## API Package Changes Required

### Repositories to Update (`@minimal-rpg/db`)

| Repository | Changes |
|------------|---------|
| `SessionRepository` | Use `sessions` table, remove `user_sessions` |
| `MessageRepository` | Remove (use EventRepository) |
| `CharacterInstanceRepository` | Remove (use ActorStateRepository) |
| `SettingInstanceRepository` | Remove (use SessionProjectionRepository) |
| `SessionStateRepository` | Remove (use SessionProjectionRepository) |
| `NpcLocationRepository` | Remove (use ActorStateRepository) |
| `AffinityRepository` | Remove (use ActorStateRepository) |

### Routes to Update (`@minimal-rpg/api`)

| Route | Changes |
|-------|---------|
| `GET /sessions` | Query `sessions` table |
| `GET /sessions/:id` | Return session + projection |
| `POST /sessions/:id/turn` | Emit `PLAYER_ACTION` event instead |
| `GET /sessions/:id/messages` | Query `events` with type filter |
| `GET /sessions/:id/npcs` | Query `actor_states` for session |

---

## Implementation Phases

### Phase A: Database Migration (This Document)

1. ✅ Write fresh migration SQL files
2. ⬜ Update Drizzle schema definitions
3. ⬜ Update migration runner to use new structure
4. ⬜ Test clean database creation

### Phase B: Repository Layer

1. ⬜ Create new repository interfaces
2. ⬜ Implement repositories against new schema
3. ⬜ Remove legacy repositories
4. ⬜ Update exports from `@minimal-rpg/db`

### Phase C: API Layer

1. ⬜ Update routes to use new repositories
2. ⬜ Remove legacy endpoints
3. ⬜ Ensure SSE streaming works with new events
4. ⬜ Update OpenAPI spec

### Phase D: Web Package

1. ⬜ Update API client to match new endpoints
2. ⬜ Refactor session hooks to use events
3. ⬜ Implement SSE-based state updates
4. ⬜ Remove legacy state management
5. ⬜ Update Session Builder to use local state

---

## Fresh Migration SQL

The following SQL files will be created:

### File: `001_foundation.sql`

```sql
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
```

### File: `002_world.sql`

```sql
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
```

### File: `003_actors.sql`

```sql
-- World Bus sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL REFERENCES user_accounts(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  setting_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  player_character_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  location_map_id UUID REFERENCES location_maps(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',  -- 'active', 'paused', 'ended'
  mode TEXT DEFAULT 'solo',  -- 'solo', 'multiplayer'
  event_seq BIGINT NOT NULL DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_owner ON sessions(owner_email);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Events (append-only World Bus event log)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sequence BIGINT NOT NULL,
  type TEXT NOT NULL,  -- 'SPOKE', 'MOVED', 'TICK', 'PLAYER_ACTION', etc.
  payload JSONB NOT NULL,
  actor_id TEXT,  -- Which actor emitted this event
  caused_by_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, sequence)
);

CREATE INDEX idx_events_session_seq ON events(session_id, sequence);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_actor ON events(actor_id);
CREATE INDEX idx_events_timestamp ON events(session_id, timestamp);

-- Actor states (XState snapshots)
CREATE TABLE actor_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,  -- 'npc', 'player', 'system'
  actor_id TEXT NOT NULL,
  entity_profile_id UUID REFERENCES entity_profiles(id) ON DELETE SET NULL,
  state JSONB NOT NULL,  -- XState persisted state + custom fields
  last_event_seq BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, actor_id)
);

CREATE INDEX idx_actor_states_session ON actor_states(session_id);
CREATE INDEX idx_actor_states_type ON actor_states(actor_type);

-- Session projections (materialized state)
CREATE TABLE session_projections (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  location JSONB NOT NULL DEFAULT '{}',  -- Current location state
  inventory JSONB NOT NULL DEFAULT '{}',  -- Player inventory
  time JSONB NOT NULL DEFAULT '{}',  -- World time
  world_state JSONB NOT NULL DEFAULT '{}',  -- Additional world state
  last_event_seq BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session participants (multiplayer)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES user_accounts(email) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'player',  -- 'player', 'gm', 'spectator'
  actor_id TEXT,  -- Links to actor_states.actor_id
  status TEXT DEFAULT 'connected',
  can_control_npcs BOOLEAN DEFAULT FALSE,
  can_edit_world BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_email)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);

-- Session plugin state
CREATE TABLE session_plugin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, plugin_id)
);

-- Session tags (simplified - session level only)
CREATE TABLE session_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, tag_id)
);
```

### File: `004_knowledge.sql`

```sql
-- Knowledge nodes (facts, memories, beliefs)
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,  -- NULL = global knowledge
  owner_email TEXT NOT NULL,
  actor_id TEXT,  -- Which actor knows this (NULL = world fact)
  node_type TEXT NOT NULL,  -- 'fact', 'event', 'relationship', 'rumor', 'belief'
  content TEXT NOT NULL,
  summary TEXT,
  confidence REAL DEFAULT 1.0,
  importance REAL DEFAULT 0.5,
  decay_rate REAL DEFAULT 0.0,
  source_type TEXT,  -- 'witnessed', 'heard', 'inferred', 'told'
  source_entity_id TEXT,
  source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  last_recalled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_nodes_session ON knowledge_nodes(session_id);
CREATE INDEX idx_knowledge_nodes_actor ON knowledge_nodes(session_id, actor_id);
CREATE INDEX idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_embedding ON knowledge_nodes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Knowledge edges (relationships between nodes)
CREATE TABLE knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,  -- 'knows', 'contradicts', 'implies', 'caused_by'
  strength REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id, relation)
);

CREATE INDEX idx_knowledge_edges_from ON knowledge_edges(from_node_id);
CREATE INDEX idx_knowledge_edges_to ON knowledge_edges(to_node_id);
```

---

## Rollback Strategy

Since this is a clean slate migration, rollback means:

1. **Restore from backup** (if any critical data existed)
2. **Or re-run old migrations** from git history if needed

For safety, before executing:

```bash
# Create backup of current schema (not data, just structure)
pg_dump --schema-only $DATABASE_URL > backup_schema_$(date +%Y%m%d).sql
```

---

## Verification Checklist

After migration, verify:

- [ ] All tables created without errors
- [ ] Foreign key relationships are correct
- [ ] Indexes created for performance
- [ ] pgvector extension works (test embedding insert)
- [ ] Drizzle introspection matches expected schema
- [ ] API can connect and query tables
- [ ] SSE streaming endpoint works
- [ ] Session creation works end-to-end

---

## Next Steps

1. **Review this plan** with team
2. **Create SQL files** in new structure
3. **Update Drizzle schema** to match
4. **Execute migration** on development DB
5. **Begin Phase B** (Repository Layer refactoring)

