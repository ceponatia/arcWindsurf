# Postgres + pgvector for Production v1 (and when to split)

This doc proposes a production-ready plan for adding DB-backed retrieval (knowledge nodes + embeddings) to Minimal RPG using Postgres + pgvector, and a benchmark-driven checklist for deciding if/when to split into a multi-DB model (Qdrant, etc.).

## Current state in this repo

- Postgres is the system of record for sessions, messages, instances, and tool history.
  - Core tables exist in `packages/db/sql/*.sql`, including:
    - `user_sessions`, `messages`, `npc_messages`
    - `character_instances`, `setting_instances` (JSONB profiles)
    - `tool_call_history`, `conversation_summaries`, `session_history`
- pgvector extension is already enabled (migration `001_init.sql` and `migrate.ts` both run `CREATE EXTENSION IF NOT EXISTS vector`).
- Retrieval is currently in-memory.
  - `@minimal-rpg/retrieval` ships `InMemoryRetrievalService` and describes `PgVectorRetrievalService` as future work.

## Recommendation for production v1

- Keep a single database: Postgres (with pgvector enabled).
- Implement a database-backed retrieval layer using pgvector.
- Delay adding MongoDB.
  - Your data is already “document-y” but works well as JSONB inside a relational core.
  - Introducing a second primary datastore adds operational overhead and consistency concerns without solving a current bottleneck.

## Important note: multi-NPC vs DB constraints

The initial schema defines `UNIQUE(session_id)` on `character_instances` and `setting_instances`. Multi-NPC support was added later by introducing a `role` column.

If you intend to store more than one `character_instance` per session (NPCs + primary), ensure you remove/adjust the old uniqueness constraint.

Suggested direction (pick one):

- Option A (recommended): Allow many instances per session.
  - Drop the `UNIQUE(session_id)` constraint on `character_instances`.
  - Add a partial unique constraint for exactly one primary per session:

```sql
-- Example only. Constraint name may differ in your DB.
ALTER TABLE character_instances
  DROP CONSTRAINT IF EXISTS character_instances_session_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_character_instances_primary_per_session
  ON character_instances(session_id)
  WHERE role = 'primary';
```

- Option B: keep 1 instance per session and model NPCs elsewhere.
  - This conflicts with existing code patterns that treat NPCs as `character_instances`.

This matters for retrieval because the retrieval layer keys knowledge nodes by `characterInstanceId` / `settingInstanceId`.

## Data model: knowledge nodes in Postgres

### Goals

- Fast query-time retrieval: “given a query embedding and session/instance scope, return top N relevant nodes”.
- Efficient ingestion: “diff nodes extracted from profiles, upsert changed content + embeddings”.
- Preserve narrative importance over time (salience) with decay + boosts.

### Core design choice: store embeddings per node

- Each knowledge node stores a single embedding vector for its `content`.
- Query uses ANN index to fetch top-K by distance and then re-ranks using your combined score function.

Why two-stage?

- If you mix distance + importance weighting directly in an ORDER BY expression, Postgres cannot use the ANN index effectively.
- Two-stage (ANN -> re-rank) preserves index usage and lets you apply your scoring model.

## Proposed schema (migration)

Create a new migration file (example name): `packages/db/sql/023_profile_nodes.sql`.

### Table: `profile_nodes`

This table is designed to map directly onto `@minimal-rpg/retrieval`’s `KnowledgeNode` type.

```sql
-- Knowledge nodes extracted from character/setting profiles.
-- One of (character_instance_id, setting_instance_id) must be non-null.

CREATE TABLE IF NOT EXISTS profile_nodes (
  id TEXT PRIMARY KEY,

  -- Scope and ownership
  session_id TEXT NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  character_instance_id TEXT REFERENCES character_instances(id) ON DELETE CASCADE,
  setting_instance_id TEXT REFERENCES setting_instances(id) ON DELETE CASCADE,

  -- Node identity within a profile
  path TEXT NOT NULL,

  -- Content and embedding
  content TEXT NOT NULL,
  embedding vector(1536),
  embedding_model TEXT NOT NULL DEFAULT 'unknown',

  -- Importance / salience
  base_importance REAL NOT NULL DEFAULT 0.5,
  narrative_importance REAL NOT NULL DEFAULT 0.0,
  last_accessed_at TIMESTAMPTZ,

  -- Bookkeeping
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce that exactly one owner type is set
  CONSTRAINT profile_nodes_owner_check CHECK (
    (character_instance_id IS NOT NULL AND setting_instance_id IS NULL)
    OR
    (character_instance_id IS NULL AND setting_instance_id IS NOT NULL)
  )
);

-- Uniqueness: each profile path should map to a single node per instance.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profile_nodes_character_path
  ON profile_nodes(character_instance_id, path)
  WHERE character_instance_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_profile_nodes_setting_path
  ON profile_nodes(setting_instance_id, path)
  WHERE setting_instance_id IS NOT NULL;

-- Common filters
CREATE INDEX IF NOT EXISTS idx_profile_nodes_session
  ON profile_nodes(session_id);

CREATE INDEX IF NOT EXISTS idx_profile_nodes_character
  ON profile_nodes(character_instance_id)
  WHERE character_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_nodes_setting
  ON profile_nodes(setting_instance_id)
  WHERE setting_instance_id IS NOT NULL;

-- Optional, for debugging or targeted updates
CREATE INDEX IF NOT EXISTS idx_profile_nodes_session_path
  ON profile_nodes(session_id, path);

-- Optional: keep updated_at in sync. If you prefer triggers, add one here.
```

Notes:

- `id` is `TEXT` to match the rest of the schema and Node.js-generated IDs.
- `embedding vector(1536)` assumes an embedding model with 1536 dims. If you use another model, change the dimension and keep it consistent.
- `content_hash` lets ingestion skip re-embedding unchanged nodes.
  - You can compute it in application code (recommended) and store it.

### Vector indexes

Pick one ANN index approach:

- HNSW (recommended for many read queries and good recall)
- IVFFLAT (good for very large corpora, requires `ANALYZE` and `lists` tuning)

#### HNSW

```sql
-- Cosine distance is the usual choice for embeddings.
-- Use vector_cosine_ops with the <=> operator.

CREATE INDEX IF NOT EXISTS idx_profile_nodes_embedding_hnsw
  ON profile_nodes
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

Query-time knob:

```sql
-- Higher ef_search improves recall at higher cost.
-- Example: set locally for a transaction.
SET LOCAL hnsw.ef_search = 64;
```

#### IVFFLAT

```sql
CREATE INDEX IF NOT EXISTS idx_profile_nodes_embedding_ivfflat
  ON profile_nodes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Important: run ANALYZE after bulk inserts.
ANALYZE profile_nodes;
```

## Query patterns

### Stage 1: ANN shortlist (use index)

Shortlist top-K by vector distance within the correct scope.

```sql
-- Parameters:
-- $1 = query_embedding (vector)
-- $2 = session_id (text)
-- $3 = character_instance_id (text) OR NULL
-- $4 = setting_instance_id (text) OR NULL
-- $5 = shortlist_k (int)

SELECT
  id,
  path,
  content,
  base_importance,
  narrative_importance,
  last_accessed_at,
  created_at,
  updated_at,
  1.0 - (embedding <=> $1) AS similarity
FROM profile_nodes
WHERE session_id = $2
  AND (
    (character_instance_id IS NOT NULL AND character_instance_id = $3)
    OR
    (setting_instance_id IS NOT NULL AND setting_instance_id = $4)
  )
  AND embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT $5;
```

Recommended defaults:

- `shortlist_k = maxNodes * 5` (or `maxNodes * 10`) to give the re-ranker room.

### Stage 2: re-rank using your scoring model

Your retrieval package’s scoring model:

$$
\text{Score} = (w_1 \times \text{Similarity}) + (w_2 \times \text{TotalImportance})
$$

Where:

- `Similarity` is cosine similarity (0-1)
- `TotalImportance = baseImportance + narrativeImportance`

Do the score computation in application code after fetching the shortlist.

Rationale:

- Keeps ANN index usage.
- Avoids complex SQL expressions that block index usage.
- Lets you evolve scoring without schema churn.

### Update salience on access

```sql
-- $1 = node_ids (text[])
-- $2 = boost (real)

UPDATE profile_nodes
SET
  narrative_importance = LEAST(1.0, narrative_importance + $2),
  last_accessed_at = now(),
  updated_at = now()
WHERE id = ANY($1);
```

### Apply decay each turn

```sql
-- $1 = session_id
-- $2 = decay_factor (real), e.g. 0.95

UPDATE profile_nodes
SET
  narrative_importance = narrative_importance * $2,
  updated_at = now()
WHERE session_id = $1
  AND narrative_importance > 0;
```

## Ingestion/upsert strategy

Ingestion should follow the patterns you already have in `@minimal-rpg/retrieval`:

1. Extract nodes from the profile JSON using configured paths.
2. Diff extracted nodes vs existing nodes for the instance.
3. For create/update:
   - Update `content`
   - Recompute embedding only if content changed (using `content_hash`)
   - Preserve `narrative_importance` when possible

Suggested ingestion query approach:

- Load existing nodes for the instance:

```sql
SELECT id, path, content, content_hash, base_importance, narrative_importance
FROM profile_nodes
WHERE character_instance_id = $1;
```

- Upsert creates/updates (one-by-one is OK for small node counts; batch later):

```sql
-- $1 id
-- $2 session_id
-- $3 character_instance_id
-- $4 setting_instance_id
-- $5 path
-- $6 content
-- $7 embedding
-- $8 embedding_model
-- $9 base_importance
-- $10 content_hash

INSERT INTO profile_nodes (
  id,
  session_id,
  character_instance_id,
  setting_instance_id,
  path,
  content,
  embedding,
  embedding_model,
  base_importance,
  content_hash
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
ON CONFLICT (id)
DO UPDATE SET
  content = EXCLUDED.content,
  embedding = EXCLUDED.embedding,
  embedding_model = EXCLUDED.embedding_model,
  base_importance = EXCLUDED.base_importance,
  content_hash = EXCLUDED.content_hash,
  updated_at = now();
```

Tip:

- Prefer conflict on `(character_instance_id, path)` / `(setting_instance_id, path)` instead of `id` if you want stable IDs per path.

## Operational guidance (production v1)

- Keep vectors in the same Postgres cluster as core OLTP tables.
- Turn on routine maintenance:
  - `VACUUM (ANALYZE)` cadence appropriate to your write volume.
  - `ANALYZE profile_nodes` after bulk ingestion.
- Watch bloat for `profile_nodes` if you upsert frequently.
- Backups: a single datastore simplifies backups and restores.

## Benchmark plan (numbers before multi-DB)

### What to measure

- Query latency (p50/p95/p99): retrieval query end-to-end.
  - Include: DB query time + application re-rank time.
- QPS at target concurrency.
- Recall@N vs brute force (quality check).
- Ingestion throughput: nodes/sec, and time to ingest an entire profile.
- Index build time and disk usage.

### Suggested dataset sizes

Start with realistic shapes:

- Nodes per character instance: 50-500
- Nodes per setting instance: 50-500
- Sessions: 1k, 10k, 100k (ramp up)

Total nodes scales roughly as:

$$
\text{nodes_total} \approx \text{sessions} \times (\text{char_nodes} + \text{setting_nodes})
$$

Example: 10k sessions x (250 + 250) = 5M nodes.

### Benchmark methodology

1. Generate or ingest real extracted nodes (preferred).
2. Use real embeddings from your chosen provider (preferred). If cost is an issue, reuse a fixed set.
3. Compare:
   - pgvector HNSW
   - pgvector IVFFLAT
4. For each configuration:
   - Run 1k-10k queries with representative query text.
   - Record p50/p95/p99 for DB query and total retrieval.
   - Evaluate recall@10 and recall@20 compared to brute-force exact search (small sample).

### Acceptance targets (pick your own, but be explicit)

Example targets for an interactive game loop:

- Retrieval p95 under 50-150ms at expected load.
- Recall@10 acceptable for your narrative quality bar.

## When to move beyond pgvector

pgvector is typically the best default until you hit a real workload boundary.

### Strong reasons to keep pgvector

- Single datastore: simplest operations, backups, and consistency.
- Tight coupling between vectors and relational session/instance data.
- Low-to-moderate scale retrieval fits comfortably.

### Triggers that justify adding a dedicated vector DB (Qdrant, etc.)

- Node count is in the multi-million range and you need higher QPS with lower latency.
- You need horizontal scaling and want to isolate vector search from OLTP load.
- You need vector-DB-specific features (aggressive quantization, distributed indexing, payload filtering at high scale).
- You want independent failure domains (vector retrieval can degrade without taking down the core game state).

### What NOT to use MongoDB for (in this architecture)

MongoDB does not replace pgvector for ANN vector search. It can store documents and even do some search-style workloads, but it does not address the core “fast ANN vector search” requirement better than pgvector or a dedicated vector DB.

If you add MongoDB, it should be for a clearly separated concern (e.g., analytics/event ingestion with different retention patterns), not as the primary store for session state.

## If/when you split: clean multi-DB boundary

If you decide to add Qdrant later:

- Postgres remains the system of record.
  - `profile_nodes` becomes metadata only, or stays as-is with an additional `vector_provider` field.
- Qdrant stores:
  - Vector embedding
  - A stable node ID (same `profile_nodes.id`)
  - Minimal payload needed for filtering (e.g., `session_id`, `character_instance_id`, `setting_instance_id`, `path`)

Migration approach:

1. Add dual-write in ingestion: write to Postgres + Qdrant.
2. Compare results in shadow mode (pgvector vs Qdrant) for quality + latency.
3. Switch reads to Qdrant if it wins.
4. Optionally keep pgvector as a fallback until confident.

## Implementation checklist (next steps)

- [ ] Decide embedding model and dimension (e.g., 1536).
- [ ] Add `profile_nodes` migration + vector index.
- [ ] Implement `PgVectorRetrievalService` in `@minimal-rpg/retrieval` that:
  - Uses ANN shortlist query + application re-rank.
  - Implements `updateSalience` and `applyDecay` as DB updates.
  - Implements ingestion via extraction + diff + upsert.
- [ ] Add a small benchmark harness script (seed + query) and run it against your expected node counts.
