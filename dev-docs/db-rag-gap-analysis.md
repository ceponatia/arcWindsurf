# DB + Retrieval (pgvector RAG) gap analysis

Date: 2025-12-18

## Scope

This doc compares the current Postgres/Supabase schema in this repo to an "ideal" schema for scalable RAG retrieval for a roleplaying game:

- Entities: characters, NPCs, personas, locations, settings
- Timeline: messages, conversation turns, events, tool calls, state changes
- Derived memory: summaries and points of interest (POIs)

It focuses on schema gaps and proposes concrete schema additions (tables + indexes) that keep existing JSONB profiles as the source of truth while adding a purpose-built retrieval layer.

Related doc:

- `dev-docs/pgvector-production-plan.md` (good foundation; proposes `profile_nodes` for profile extraction)

## Current DB state (relevant parts)

### Existing entity/profile storage

- `character_profiles`: dynamic character templates
  - Columns: `id`, `profile_json`, timestamps
- `character_instances`: per-session snapshots
  - Columns: `id`, `session_id`, `template_id`, `template_snapshot`, `profile_json`, timestamps
  - Later additions: `overrides_json`, `role`, `label`

Observation:

- Rich attributes (eye color, scent, etc.) live inside `profile_json` (JSONB) rather than columns.

### Existing timeline and long-session storage

- `messages`: per-session assistant/user messages
- `npc_messages`: per-session per-NPC transcript (agent-facing)
- `session_history`: per-turn debug + context snapshots
  - Columns: `player_input`, `context_json`, `debug_json`
- `tool_call_history`: tool usage details per turn
- `conversation_summaries`: summary text per session (and optionally per NPC)
- `state_change_log`: audit-style state patch metadata (paths, agent types)

### Existing pgvector posture

- The `vector` extension is created in migrations.
- There are currently no tables that store embeddings (no `vector(n)` columns) and no ANN indexes.

## Gaps vs ideal RAG schema

### Gap A: No embedding storage

Current tables store raw text and JSON, but there is nowhere to persist:

- Derived text chunks that will be embedded
- Embedding vectors
- Embedding model/version metadata
- Content hashes to skip re-embedding

Impact:

- Retrieval must be in-memory (current situation) or re-embed on demand.
- You cannot scale to large message/event histories efficiently.

### Gap B: No chunking strategy at the DB layer

For RAG, the unit of retrieval matters. The current DB is organized by app features, not retrieval units.

Ideal retrieval units:

- Entity docs (slow-changing): character/location/setting sections
- Timeline chunks (fast-growing): message-level or small window chunks
- Summaries (hierarchical memory): periodic rollups
- POIs (high-signal memory): extracted facts, hooks, relationship changes

Impact:

- A naive "embed whole session" approach will degrade recall/precision and become expensive.

### Gap C: Weak metadata for retrieval filtering

To keep retrieval relevant, most queries need metadata filters:

- `session_id`
- `npc_instance_id` (or `character_instance_id`)
- `location_id`
- time range (`turn_idx` or `created_at`)
- entity scope (global lore vs session-local)

Impact:

- Without explicit columns, filtering requires JSONB parsing or cannot be expressed.

### Gap D: No incremental update mechanism

You already store good building blocks for incremental updates:

- `state_change_log.modified_paths`
- `overrides_json` for instance diffs
- `conversation_summaries.covers_up_to_turn`

But there is no schema to tie those signals to re-embedding jobs or embedding invalidation.

Impact:

- You will either (a) re-embed too much or (b) drift into stale embeddings.

### Gap E: Multi-NPC constraint mismatch (important pre-req)

`character_instances` is created with `UNIQUE(session_id)` in the initial schema. Multi-NPC support later adds `role`, but the uniqueness constraint remains.

Impact:

- Inserting multiple NPC `character_instances` per session conflicts with the constraint.
- This also blocks a retrieval design that scopes memory by `character_instance_id`.

Ideal:

- Allow multiple `character_instances` per session.
- Keep a partial unique constraint for one primary per session.

## Ideal target state (high level)

1. Keep JSONB as source of truth

- `character_profiles.profile_json`, `character_instances.profile_json`, `locations.*` remain authoritative.

2. Add a retrieval layer (derived data)

- Separate tables to store:
  - derived text `content`
  - embedding `vector(n)`
  - metadata columns for filtering
  - provenance pointers back to source rows (message_id, event_id, etc.)

3. Use hierarchical memory

- Retrieval pulls from multiple sources:
  - recency window (raw messages, no vector)
  - summaries (vector + text)
  - POIs (vector + structured metadata)
  - raw timeline chunks (vector)

## Proposed schema additions (SQL)

Notes:

- Use `TEXT` primary keys to match existing patterns.
- Keep embeddings nullable to allow staged backfills.
- Choose and lock the embedding dimension (example below uses 1536).
- Prefer cosine distance (`vector_cosine_ops`).

### 1) Fix multi-NPC uniqueness (pre-req)

```sql
-- Allow many character_instances per session.
ALTER TABLE character_instances
  DROP CONSTRAINT IF EXISTS character_instances_session_id_key;

-- Keep exactly one primary per session.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_character_instances_primary_per_session
  ON character_instances(session_id)
  WHERE role = 'primary';
```

### 2) Entity documents: `rag_entity_documents`

Purpose:

- Store chunked, embed-ready text derived from JSONB profiles and location data.
- Retrieve context about characters, locations, settings, personas.

```sql
CREATE TABLE IF NOT EXISTS rag_entity_documents (
  id TEXT PRIMARY KEY,

  -- Entity identity
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'character_instance',
    'character_profile',
    'setting_instance',
    'setting_profile',
    'persona_profile',
    'location',
    'location_prefab'
  )),
  entity_id TEXT NOT NULL,

  -- Optional scope
  session_id TEXT REFERENCES user_sessions(id) ON DELETE CASCADE,

  -- Chunk identity
  section TEXT NOT NULL,            -- e.g. 'basics', 'appearance', 'body', 'personality', 'summary'
  path TEXT,                        -- optional: schema path like 'physique.appearance.eyes'

  -- Payload
  content TEXT NOT NULL,
  content_hash TEXT,

  -- Embedding
  embedding vector(1536),
  embedding_model TEXT NOT NULL DEFAULT 'unknown',

  -- Lightweight retrieval knobs
  importance REAL NOT NULL DEFAULT 0.5,
  last_accessed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- De-dupe: one section per entity per session scope.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_rag_entity_documents
  ON rag_entity_documents(entity_type, entity_id, COALESCE(session_id, ''), section);

CREATE INDEX IF NOT EXISTS idx_rag_entity_documents_session
  ON rag_entity_documents(session_id)
  WHERE session_id IS NOT NULL;
```

Vector index (pick one):

```sql
-- HNSW (recommended when available)
CREATE INDEX IF NOT EXISTS idx_rag_entity_documents_embedding_hnsw
  ON rag_entity_documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### 3) Timeline chunks: `rag_timeline_chunks`

Purpose:

- Scalable retrieval across many rows of history.
- Supports messages, per-NPC messages, tool calls, events, and state change summaries.

```sql
CREATE TABLE IF NOT EXISTS rag_timeline_chunks (
  id TEXT PRIMARY KEY,

  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,

  -- Provenance
  source_type TEXT NOT NULL CHECK (source_type IN (
    'message',
    'npc_message',
    'session_history',
    'tool_call',
    'state_change',
    'event'
  )),
  source_id TEXT NOT NULL,

  -- Timeline alignment
  turn_idx INTEGER,                 -- for turn-based sources
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Optional scope filters
  npc_instance_id TEXT REFERENCES character_instances(id) ON DELETE SET NULL,
  location_id TEXT,

  -- Payload
  speaker TEXT,                     -- e.g. 'user', 'assistant', npc name
  content TEXT NOT NULL,
  content_hash TEXT,

  -- Embedding
  embedding vector(1536),
  embedding_model TEXT NOT NULL DEFAULT 'unknown',

  -- Retrieval knobs
  importance REAL NOT NULL DEFAULT 0.5
);

-- Fast time/turn slicing
CREATE INDEX IF NOT EXISTS idx_rag_timeline_chunks_session_turn
  ON rag_timeline_chunks(session_id, turn_idx)
  WHERE turn_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rag_timeline_chunks_session_created
  ON rag_timeline_chunks(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_timeline_chunks_npc
  ON rag_timeline_chunks(npc_instance_id)
  WHERE npc_instance_id IS NOT NULL;

-- ANN
CREATE INDEX IF NOT EXISTS idx_rag_timeline_chunks_embedding_hnsw
  ON rag_timeline_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### 4) POIs (high-signal memory): `rag_pois`

Purpose:

- Extracted, structured "things worth remembering" so retrieval is high precision.
- POIs are typically derived from messages/events and are fewer than raw chunks.

```sql
CREATE TABLE IF NOT EXISTS rag_pois (
  id TEXT PRIMARY KEY,

  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,

  -- What kind of memory is this?
  poi_type TEXT NOT NULL CHECK (poi_type IN (
    'fact',
    'quest',
    'relationship',
    'promise',
    'item',
    'location',
    'rule',
    'mystery'
  )),

  -- Links
  source_chunk_id TEXT REFERENCES rag_timeline_chunks(id) ON DELETE SET NULL,
  turn_idx INTEGER,

  -- Optional scope
  npc_instance_id TEXT REFERENCES character_instances(id) ON DELETE SET NULL,
  location_id TEXT,

  -- Content
  title TEXT,
  content TEXT NOT NULL,
  content_hash TEXT,

  -- Embedding
  embedding vector(1536),
  embedding_model TEXT NOT NULL DEFAULT 'unknown',

  -- Retrieval knobs
  importance REAL NOT NULL DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_pois_session
  ON rag_pois(session_id);

CREATE INDEX IF NOT EXISTS idx_rag_pois_npc
  ON rag_pois(npc_instance_id)
  WHERE npc_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rag_pois_embedding_hnsw
  ON rag_pois
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### 5) Embeddable summaries: extend `conversation_summaries`

You already have `conversation_summaries`. Two options:

- Option A (minimal): add embedding fields to the existing table.
- Option B (more flexible): keep it purely text and embed into `rag_entity_documents` with `entity_type = 'session_summary'`.

Option A SQL:

```sql
ALTER TABLE conversation_summaries
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_model TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_embedding_hnsw
  ON conversation_summaries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

## Ingestion and backfill notes (non-schema)

- Entity docs:
  - Derive `content` from JSONB profiles by section (basics/appearance/body/personality/details).
  - Use `content_hash` to skip re-embedding when unchanged.
  - Recompute when `character_instances.profile_json` changes (or `overrides_json` changes).

- Timeline:
  - Always provide a recency window from raw tables (`messages`, `npc_messages`) without vectors.
  - For long-term recall, embed:
    - per message (or 2-4 message windows)
    - per turn summary
    - extracted POIs

- Use existing signals:
  - `state_change_log.modified_paths` can hint which entity sections to re-embed.
  - `conversation_summaries.covers_up_to_turn` gives a natural cadence for summary embeddings.

## Supabase-specific considerations

- Ensure extensions:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

- HNSW availability depends on your pgvector version.
  - If HNSW is not available, use IVFFLAT.

```sql
-- IVFFLAT fallback
CREATE INDEX IF NOT EXISTS idx_rag_timeline_chunks_embedding_ivfflat
  ON rag_timeline_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ANALYZE rag_timeline_chunks;
```

- Consider partitioning for `rag_timeline_chunks` if it grows very large (monthly partitions by `created_at` are the simplest).
- If you enable RLS later, keep retrieval tables consistent with your session/user ownership model.

## Recommended migration breakdown

- `024_fix_character_instances_uniqueness.sql`
- `025_rag_entity_documents.sql`
- `026_rag_timeline_chunks.sql`
- `027_rag_pois.sql`
- `028_conversation_summaries_embeddings.sql` (optional)

This sequencing keeps behavior changes small and makes it easier to backfill incrementally.
