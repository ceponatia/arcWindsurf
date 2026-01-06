# Database Migration Refactor Plan

**Date**: January 2026  
**Status**: Planning Document  
**Related**: `cascade-refactor-vision.md`, `vision-synthesis-analysis.md`

---

## Executive Summary

This document analyzes the current database schema (31 migrations) and proposes a clean starting point for the ArcAgentic refactor. The goals are:

1. **Simplify**: Remove redundant/unused tables
2. **Consolidate**: Merge overlapping systems
3. **Expand**: Add fields for richer entity modeling
4. **Prepare**: Structure for event sourcing, knowledge graphs, and multiplayer

---

## Current Schema Analysis

### Migration File Issues

| Issue | Files | Impact |
|-------|-------|--------|
| **Duplicate migration numbers** | `017_locations_refactor.sql`, `017_npc_hygiene_state.sql` | Migration ordering ambiguity |
| **Created then dropped** | `021_tool_call_history.sql` → `028_drop_tool_call_history.sql` | Dead code in migration history |
| **Late ownership addition** | `024_owner_email.sql` (624 lines) | Massive migration adds `owner_email` to 20+ tables |
| **Inconsistent ID types** | `TEXT` vs `UUID` across tables | Type confusion, join inefficiency |

### Table Categories

### Core Session (6 tables)

- `user_sessions` - Session root
- `messages` - Player-facing chat history
- `npc_messages` - Per-NPC transcripts with `witnessed_by`
- `session_history` - Turn-level debug data
- `state_change_log` - Audit log for state patches
- `scene_actions` - Multi-NPC action coordination

### Entity Profiles (5 tables)

- `character_profiles` - NPC/character templates
- `setting_profiles` - World/setting templates
- `persona_profiles` - Legacy player personas (from 001_init)
- `personas` - Player character templates (from 008)
- `session_personas` - Per-session player state

### Entity Instances (3 tables)

- `character_instances` - Per-session character snapshots
- `setting_instances` - Per-session setting snapshots
- `item_instances` - Per-session item copies

### State Slices (5 tables)

- `session_location_state` - Player location
- `session_inventory_state` - Player inventory
- `session_time_state` - Game time
- `session_affinity_state` - NPC relationships
- `session_player_interest` - NPC tier promotion scores

### NPC Simulation (4 tables)

- `session_npc_location_state` - NPC whereabouts
- `session_npc_simulation_cache` - Lazy simulation state
- `session_location_occupancy_cache` - Location occupancy
- `npc_hygiene_state` - Per-body-part hygiene decay

### Location System (7 tables)

- `location_maps` - Visual location graphs
- `location_prefabs` - Reusable location groups
- `locations` - Individual location definitions
- `prefab_location_instances` - Prefab→location junction
- `prefab_connections` - Location links
- `prefab_entry_points` - Entry/exit nodes
- `session_location_maps` - Per-session map instances

### Scheduling (2 tables)

- `schedule_templates` - Reusable NPC schedules
- `npc_schedules` - Per-session resolved schedules

### Tags (2 tables)

- `prompt_tags` - Tag definitions with activation rules
- `session_tag_bindings` - Session→tag→entity bindings

### Items (2 tables)

- `item_definitions` - Item templates
- `item_instances` - Per-session items

### Users (1 table)

- `user_accounts` - Auth, preferences, roles

---

## Tables to DROP

### Immediate Drops (Unused/Redundant)

| Table | Reason | Migration |
|-------|--------|-----------|
| `persona_profiles` | Superseded by `personas` table (008). Redundant legacy table. | 001_init |
| `state_change_log` | Low-value audit; event sourcing will replace. No active consumers. | 004 |
| `session_location_occupancy_cache` | Performance cache only; can be computed on-demand from `session_npc_location_state`. | 012 |
| `session_npc_simulation_cache` | Performance cache; rebuild from events if needed. | 012 |
| `session_workspace_drafts` | Wizard-specific; can be localStorage or re-implemented simpler. | 015 |

### Consolidation Candidates (Merge into Unified Tables)

| Tables | Consolidate Into | Reason |
|--------|-----------------|--------|
| `session_location_state`, `session_inventory_state`, `session_time_state` | `session_state` (single JSONB) | All are 1:1 with session, rarely queried independently |
| `session_affinity_state`, `session_player_interest` | `session_npc_state` | Both track per-NPC-per-session data; can combine |
| `character_profiles`, `setting_profiles` | `entity_profiles` with `entity_type` column | Unified template storage |
| `character_instances`, `setting_instances` | `entity_instances` with `entity_type` column | Unified instance storage |

---

## Tables to EXPAND

### `user_sessions`

```sql
-- Current fields preserved
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS
  -- Session metadata
  title TEXT,                           -- User-defined session name
  status TEXT DEFAULT 'active',         -- 'active', 'paused', 'completed', 'archived'
  
  -- Multiplayer support (Phase 8)
  mode TEXT DEFAULT 'solo',             -- 'solo', 'gm', 'troupe', 'pvp'
  max_players INTEGER DEFAULT 1,
  
  -- Event sourcing support
  event_sequence BIGINT DEFAULT 0,      -- Last event sequence number
  snapshot_at BIGINT,                   -- Event sequence of last snapshot
  
  -- Analytics
  turn_count INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  last_turn_at TIMESTAMPTZ;
```

### `character_profiles`

```sql
ALTER TABLE character_profiles ADD COLUMN IF NOT EXISTS
  -- Extracted fields for indexing/filtering
  name TEXT GENERATED ALWAYS AS (profile_json->>'name') STORED,
  tier TEXT GENERATED ALWAYS AS (profile_json->>'tier') STORED,
  -- race and alignment already added in 030
  
  -- Ownership & visibility
  owner_email TEXT NOT NULL DEFAULT 'public',
  visibility TEXT DEFAULT 'public',     -- 'private', 'public', 'unlisted'
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_id TEXT,                       -- For forked/derived characters
  
  -- Embedding for semantic search
  embedding vector(1536);

CREATE INDEX idx_character_profiles_name ON character_profiles(name);
CREATE INDEX idx_character_profiles_tier ON character_profiles(tier);
CREATE INDEX idx_character_profiles_owner ON character_profiles(owner_email);
```

### `setting_profiles`

```sql
ALTER TABLE setting_profiles ADD COLUMN IF NOT EXISTS
  -- Extracted fields
  name TEXT GENERATED ALWAYS AS (profile_json->>'name') STORED,
  
  -- Ownership & visibility
  owner_email TEXT NOT NULL DEFAULT 'public',
  visibility TEXT DEFAULT 'public',
  
  -- Categorization
  genre TEXT,                           -- 'fantasy', 'scifi', 'modern', 'historical'
  themes TEXT[],                        -- ['dark', 'comedy', 'romance']
  
  -- Embedding
  embedding vector(1536);
```

### `messages`

```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS
  -- Richer message metadata
  message_type TEXT DEFAULT 'chat',     -- 'chat', 'narration', 'system', 'tool_result'
  
  -- Embedding for semantic search/retrieval
  embedding vector(1536),
  
  -- Tool call tracking (replacing dropped tool_call_history)
  tool_calls JSONB,                     -- [{name, args, result}] if assistant message
  
  -- Parent message for branching (event sourcing)
  parent_id TEXT,
  branch_id TEXT;                       -- Null = main branch
```

### `npc_messages`

```sql
ALTER TABLE npc_messages ADD COLUMN IF NOT EXISTS
  -- Emotional/tonal metadata
  tone TEXT,                            -- 'friendly', 'hostile', 'neutral', etc.
  emotion_scores JSONB,                 -- {anger: 0.2, joy: 0.8, ...}
  
  -- Location context
  location_id TEXT,
  
  -- Embedding for NPC memory retrieval
  embedding vector(1536);
```

### `locations`

```sql
ALTER TABLE locations ADD COLUMN IF NOT EXISTS
  -- Richer location modeling
  parent_location_id UUID,              -- Hierarchical containment
  capacity INTEGER,                     -- Max occupants
  accessibility TEXT DEFAULT 'open',    -- 'open', 'locked', 'hidden', 'destroyed'
  
  -- Atmosphere/sensory
  atmosphere JSONB,                     -- {lighting, temperature, noise_level, smells[]}
  
  -- Ownership
  owner_email TEXT NOT NULL DEFAULT 'system',
  setting_id TEXT,                      -- Link to setting this location belongs to
  
  -- Embedding
  embedding vector(1536);
```

### `prompt_tags`

```sql
ALTER TABLE prompt_tags ADD COLUMN IF NOT EXISTS
  -- Plugin support
  plugin_id TEXT,                       -- Which plugin provides this tag
  
  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Embedding for semantic tag search
  embedding vector(1536);
```

---

## NEW Tables to Add

### Event Sourcing Foundation

```sql
-- Game events (append-only log)
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  
  -- Event ordering
  sequence BIGINT NOT NULL,             -- Monotonic per session
  
  -- Event data
  event_type TEXT NOT NULL,             -- 'PLAYER_MOVED', 'NPC_SPOKE', 'ITEM_ACQUIRED', etc.
  payload JSONB NOT NULL,
  
  -- Causality
  caused_by_event_id UUID,              -- Which event triggered this one
  turn_idx INTEGER,
  
  -- Metadata
  agent_id TEXT,                        -- Which agent produced this event
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, sequence)
);

CREATE INDEX idx_game_events_session_seq ON game_events(session_id, sequence);
CREATE INDEX idx_game_events_type ON game_events(event_type);
CREATE INDEX idx_game_events_owner ON game_events(owner_email, session_id);

-- Session snapshots (periodic state captures for fast replay)
CREATE TABLE session_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  
  -- Snapshot position
  at_sequence BIGINT NOT NULL,
  
  -- Full state at this point
  state_json JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, at_sequence)
);
```

### Knowledge Graph / NPC Memory

```sql
-- Knowledge nodes (facts, memories, relationships)
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  session_id TEXT REFERENCES user_sessions(id) ON DELETE CASCADE, -- NULL = global knowledge
  owner_email TEXT NOT NULL,
  npc_id TEXT,                          -- Which NPC knows this (NULL = world fact)
  
  -- Content
  node_type TEXT NOT NULL,              -- 'fact', 'event', 'relationship', 'rumor', 'belief'
  content TEXT NOT NULL,
  summary TEXT,                         -- Short version for prompts
  
  -- Confidence & decay
  confidence REAL DEFAULT 1.0,          -- How certain (rumors < facts)
  importance REAL DEFAULT 0.5,          -- Relevance weight
  decay_rate REAL DEFAULT 0.0,          -- Memory fade per day
  
  -- Source tracking
  source_type TEXT,                     -- 'witnessed', 'heard', 'inferred', 'told'
  source_entity_id TEXT,                -- Who told them
  source_event_id UUID,                 -- Which event created this
  
  -- Timestamps
  learned_at TIMESTAMPTZ DEFAULT NOW(), -- When acquired
  last_recalled_at TIMESTAMPTZ,         -- For importance boosting
  expires_at TIMESTAMPTZ,               -- Optional TTL
  
  -- Embedding for semantic search
  embedding vector(1536),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_nodes_session ON knowledge_nodes(session_id);
CREATE INDEX idx_knowledge_nodes_npc ON knowledge_nodes(session_id, npc_id);
CREATE INDEX idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_embedding ON knowledge_nodes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Knowledge edges (relationships between nodes)
CREATE TABLE knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  from_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  
  relation TEXT NOT NULL,               -- 'knows', 'contradicts', 'implies', 'caused_by'
  strength REAL DEFAULT 1.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_node_id, to_node_id, relation)
);

CREATE INDEX idx_knowledge_edges_from ON knowledge_edges(from_node_id);
CREATE INDEX idx_knowledge_edges_to ON knowledge_edges(to_node_id);
```

### Multiplayer Support

```sql
-- Session participants (for multiplayer)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  
  -- Participant identity
  user_email TEXT NOT NULL,
  display_name TEXT,
  
  -- Role
  role TEXT NOT NULL DEFAULT 'player',  -- 'player', 'gm', 'spectator'
  character_instance_id TEXT,           -- Which character they control
  
  -- Connection state
  status TEXT DEFAULT 'connected',      -- 'connected', 'disconnected', 'away'
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Permissions
  can_control_npcs BOOLEAN DEFAULT FALSE,
  can_edit_world BOOLEAN DEFAULT FALSE,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, user_email)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_email);
```

### Plugin System Support

```sql
-- Registered plugins
CREATE TABLE plugins (
  id TEXT PRIMARY KEY,                  -- e.g., '@arcagentic/plugin-combat'
  
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  
  -- Plugin manifest
  manifest JSONB NOT NULL,              -- {schemas, tools, agents, routes, ui}
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plugin state per session
CREATE TABLE session_plugin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  
  -- Plugin-specific state
  state_json JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, plugin_id)
);
```

### Consolidated Entity Tables (Optional Refactor)

```sql
-- Unified entity profiles (replaces character_profiles + setting_profiles)
CREATE TABLE entity_profiles (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,            -- 'character', 'setting', 'item', 'faction'
  
  -- Core data
  name TEXT NOT NULL,
  profile_json JSONB NOT NULL,
  
  -- Ownership
  owner_email TEXT NOT NULL DEFAULT 'public',
  visibility TEXT DEFAULT 'public',
  
  -- Categorization
  tier TEXT,                            -- For characters: 'major', 'minor', 'background'
  tags TEXT[],
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_id TEXT,
  
  -- Search
  embedding vector(1536),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entity_profiles_type ON entity_profiles(entity_type);
CREATE INDEX idx_entity_profiles_owner ON entity_profiles(owner_email);
CREATE INDEX idx_entity_profiles_name ON entity_profiles(name);
```

---

## Migration Strategy

### Phase 1: Cleanup (Week 1)

1. **Drop unused tables**

   ```sql
   DROP TABLE IF EXISTS persona_profiles CASCADE;
   DROP TABLE IF EXISTS state_change_log CASCADE;
   DROP TABLE IF EXISTS session_location_occupancy_cache CASCADE;
   DROP TABLE IF EXISTS session_npc_simulation_cache CASCADE;
   DROP TABLE IF EXISTS session_workspace_drafts CASCADE;
   ```

2. **Fix migration numbering**
   - Rename `017_npc_hygiene_state.sql` → `017b_npc_hygiene_state.sql`
   - Or consolidate into single `017_locations_and_hygiene.sql`

3. **Standardize ID types**
   - Audit all `UUID` vs `TEXT` usage
   - Prefer `TEXT` for human-readable IDs, `UUID` for system-generated

### Phase 2: Expand Existing Tables (Week 2)

1. Add new columns to `user_sessions`, `character_profiles`, `setting_profiles`
2. Add embeddings support to key tables
3. Add `message_type` and `tool_calls` to `messages`
4. Create indexes for new columns

### Phase 3: Event Sourcing Foundation (Week 3)

1. Create `game_events` table
2. Create `session_snapshots` table
3. Backfill events from existing session history (optional)

### Phase 4: Knowledge Graph (Week 4)

1. Create `knowledge_nodes` table
2. Create `knowledge_edges` table
3. Migrate any existing NPC memory from JSONB blobs

### Phase 5: Multiplayer & Plugins (Weeks 5-6)

1. Create `session_participants` table
2. Create `plugins` and `session_plugin_state` tables
3. Add multiplayer columns to `user_sessions`

---

## Data Migration Notes

### Preserving Existing Data

For production deployments, each ALTER/DROP needs:

1. **Backup** the table before modification
2. **Feature flag** to enable new schema incrementally
3. **Dual-write** during transition (write to old + new)
4. **Backfill** script for historical data

### Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Drop `persona_profiles` | Old sessions referencing it | Migrate to `personas` first |
| Drop state caches | Potential performance regression | Monitor and optimize queries |
| New required columns | Insert failures | Add with defaults, backfill |

### Test Data Seeding

Update `029_seed_test_entities.sql` to:

- Use new schema structure
- Include sample knowledge nodes
- Include sample game events
- Test multiplayer participant data

---

## Appendix: Current Table Inventory

| # | Table | Created | Status | Recommendation |
|---|-------|---------|--------|----------------|
| 1 | `user_sessions` | 001 | Active | **Expand** |
| 2 | `messages` | 001 | Active | **Expand** |
| 3 | `npc_messages` | 001 | Active | **Expand** |
| 4 | `character_instances` | 001 | Active | Keep |
| 5 | `setting_instances` | 001 | Active | Keep |
| 6 | `character_profiles` | 001 | Active | **Expand** |
| 7 | `setting_profiles` | 001 | Active | **Expand** |
| 8 | `persona_profiles` | 001 | Legacy | **DROP** |
| 9 | `prompt_tags` | 002 | Active | **Expand** |
| 10 | `session_tag_bindings` | 002 | Active | Keep |
| 11 | `state_change_log` | 004 | Unused | **DROP** |
| 12 | `session_location_state` | 005 | Active | Consolidate? |
| 13 | `session_inventory_state` | 005 | Active | Consolidate? |
| 14 | `session_time_state` | 005 | Active | Consolidate? |
| 15 | `item_definitions` | 007 | Active | Keep |
| 16 | `item_instances` | 007 | Active | Keep |
| 17 | `personas` | 008 | Active | Keep |
| 18 | `session_personas` | 008 | Active | Keep |
| 19 | `session_history` | 009 | Active | Keep (debug) |
| 20 | `scene_actions` | 010 | Active | Keep |
| 21 | `session_npc_location_state` | 012 | Active | Keep |
| 22 | `session_npc_simulation_cache` | 012 | Cache | **DROP** |
| 23 | `session_location_occupancy_cache` | 012 | Cache | **DROP** |
| 24 | `session_affinity_state` | 013 | Active | Consolidate? |
| 25 | `session_player_interest` | 014 | Active | Consolidate? |
| 26 | `session_workspace_drafts` | 015 | Wizard | **DROP** |
| 27 | `location_maps` | 016 | Active | Keep |
| 28 | `location_prefabs` | 016 | Active | Keep |
| 29 | `session_location_maps` | 016 | Active | Keep |
| 30 | `locations` | 017 | Active | **Expand** |
| 31 | `prefab_location_instances` | 017 | Active | Keep |
| 32 | `prefab_connections` | 017 | Active | Keep |
| 33 | `prefab_entry_points` | 017 | Active | Keep |
| 34 | `npc_hygiene_state` | 017b | Active | Keep |
| 35 | `schedule_templates` | 018 | Active | Keep |
| 36 | `npc_schedules` | 018 | Active | Keep |
| 37 | `user_accounts` | 019 | Active | Keep |

**Summary**:

- **DROP**: 5 tables
- **EXPAND**: 7 tables
- **NEW**: 7 tables
- **KEEP**: 25 tables

---

## Next Steps

1. [ ] Review this plan with team
2. [ ] Prioritize based on immediate refactor needs
3. [ ] Create individual migration files for each phase
4. [ ] Update TypeScript types in `@minimal-rpg/schemas`
5. [ ] Update data access layer in `@minimal-rpg/db`
6. [ ] Add Drizzle ORM schemas (per vision docs)

---

*This document provides a clean starting point for the database refactor. Actual implementation should be incremental with proper testing at each phase.*
