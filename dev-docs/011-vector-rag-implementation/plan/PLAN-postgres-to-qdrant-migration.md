# PostgreSQL to Qdrant Migration Plan

## Overview

This document outlines the migration strategy from PostgreSQL (currently using `pgvector` in `entity_profiles`, `locations`, and `knowledge_nodes`) to Qdrant for vector storage and semantic search. This move aims to separate vector workloads from relational workloads, enabling advanced filtering, larger scaling, and specialized vector search capabilities.

### Current State Assessment

The codebase currently has:

- **DB Schema**: `entity_profiles`, `locations`, and `knowledge_nodes` tables have `embedding vector(1536)` columns with ivfflat indexes for cosine similarity
- **Retrieval Package** (`@minimal-rpg/retrieval`): Defines `EmbeddingService` interface and `InMemoryRetrievalService` but lacks:
  - Real embedding provider implementation
  - Database-backed retrieval service
  - Integration with actor cognition pipeline
- **Actor Cognition** (`@minimal-rpg/actors`): `CognitionLayer.decideLLM()` builds prompts from profile traits and recent events only - no semantic retrieval
- **Knowledge Graph**: `knowledge_edges` table exists for graph relationships (Graph-RAG foundation ready)

### Goals

1. **Semantic Search at Scale** - Fast, accurate similarity search across NPC memories, world state, and entity attributes
2. **Rich Metadata Filtering** - Complex queries combining vector similarity with structured filters (e.g., "memories about dragons, held by this NPC, with importance > 0.8")
3. **Hybrid Architecture** - PostgreSQL remains the source of truth for relational data (ACID); Qdrant handles vector search and retrieval
4. **Extensibility** - Schemas designed for expansion (using `attributes` payloads) without requiring database migrations
5. **Cost Efficiency** - Semantic caching to reduce redundant LLM calls for similar queries
6. **Cold-Start Resilience** - Graceful degradation when embeddings are unavailable

---

## Architecture Decision: Hybrid PostgreSQL + Qdrant

### Source of Truth (PostgreSQL)

| Table | Vector Column | New Strategy |
| :--- | :--- | :--- |
| `entity_profiles` | `embedding` | Remove column. Sync validation/profile data to Qdrant `entities` collection. |
| `locations` | `embedding` | Remove column. Sync static description/summary to Qdrant `entities` collection. |
| `knowledge_nodes` | `embedding` | Remove column. Sync memory content to Qdrant `memories` collection. |
| `events` | *None* | No change in Postgres. Feed for `events_vectors` in Qdrant. |
| `studio_sessions` | *None* | Conversation history persisted here; embeddings for dialogue go to Qdrant `dialogue` collection. |
| `session_projections` | *None* | Source for `world_state` snapshots in Qdrant. |

### Qdrant Collections

| Collection | Source Data | Role |
| :--- | :--- | :--- |
| `entities` | `entity_profiles` + `locations` | All "physical" things (characters, locations, items). Supports semantic search by description, traits, atmosphere. |
| `memories` | `knowledge_nodes` | Internal state of NPCs (facts, beliefs, rumors). Supports actor-specific and session-scoped faceting. |
| `events_vectors` | `events` | Episodic memory (both raw events and LLM-summarized episodes). |
| `dialogue` | `events` (SPOKE type) | Dedicated conversation history for high-fidelity dialogue retrieval. |
| `world_state` | `session_projections` | Snapshots for temporal queries ("What was the world like when...?"). |
| `query_cache` | Runtime | Semantic cache for query-response pairs to reduce redundant inference. |

### Retrieval Strategy (Dynamic Context Assembly)

Replace fixed context windows with a dynamic assembly pipeline that builds context based on relevance:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Context Assembly Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. STRICT (Always included, from Postgres)                       │
│    - Current location description                                │
│    - Present actors in location (session_participants)           │
│    - Actor's core profile traits                                 │
├─────────────────────────────────────────────────────────────────┤
│ 2. SHORT-TERM (Last N turns, from Postgres events)               │
│    - Recent dialogue (configurable window, default 10)           │
│    - Recent actions affecting this actor                         │
├─────────────────────────────────────────────────────────────────┤
│ 3. SEMANTIC (Vector search, from Qdrant)                         │
│    - Query: embed(player_input + recent_context_summary)         │
│    - Search: memories (actor-scoped), entities (world knowledge) │
│    - Filter: session_id, actor_id, importance > threshold        │
├─────────────────────────────────────────────────────────────────┤
│ 4. GRAPH EXPANSION (From Postgres knowledge_edges)               │
│    - For top semantic results, expand via graph relationships    │
│    - Edge types: 'knows', 'enemy_of', 'related_to', 'caused_by'  │
├─────────────────────────────────────────────────────────────────┤
│ 5. RE-RANKING (Cross-Encoder, optional for quality)              │
│    - Pass top 50 candidates through cross-encoder                │
│    - Return top 10 with precise relevance scores                 │
├─────────────────────────────────────────────────────────────────┤
│ 6. DEDUPLICATION & ASSEMBLY                                      │
│    - Remove redundant information                                │
│    - Format into structured prompt sections                      │
│    - Respect token budget                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Ranking Formula

Combined score for retrieved nodes:

```typescript
score = (similarity * 0.5) + (recency * 0.2) + (importance * 0.2) + (graph_boost * 0.1)
```

Where:
- `similarity`: Cosine similarity from vector search (0-1)
- `recency`: Decay function based on time since last access (`exp(-lambda * hours_since)`)
- `importance`: Node importance from `knowledge_nodes.importance` (0-1)
- `graph_boost`: Bonus if node is reachable via knowledge_edges from other high-scoring results

### Graph-RAG Hybrid

Leverage the existing `knowledge_edges` table to augment vector results:

1. **Vector Step**: Query Qdrant for "King's enemy". Result: "King Alaric" (high similarity)
2. **Graph Step**: Query `knowledge_edges` for relations from "King Alaric" with edge types like `'enemy_of'`, `'rival'`, `'betrayed_by'`
3. **Expansion**: Include connected nodes like "Duke Blackwood" even if semantically dissimilar
4. **Benefit**: Discovers structurally critical entities that pure semantic search would miss

### Semantic Caching

Reduce redundant inference by caching query-response pairs:

```typescript
interface CacheEntry {
  query_embedding: number[];  // Original query embedding
  query_hash: string;         // MD5 of normalized query text
  response_context: string;   // Retrieved context that was used
  response_output: string;    // LLM-generated response
  created_at: number;         // Unix timestamp
  hit_count: number;          // Usage tracking
  session_id?: string;        // Optional session scope
}
```

**Cache Lookup Flow:**
1. Embed incoming query
2. Search `query_cache` collection with threshold > 0.95 similarity
3. If match found AND session context hasn't changed significantly, return cached context
4. Otherwise, proceed with full retrieval pipeline

**Invalidation:**
- TTL-based expiration (configurable, default 1 hour for dynamic sessions)
- Explicit invalidation on entity updates
- Session-scoped caches invalidated on session state changes

---

## Migration Strategy

### Phase 0: Foundation (Prerequisites)

Before migration, implement missing infrastructure:

1. **EmbeddingService Implementation** (`@minimal-rpg/llm`)

   ```typescript
   // packages/llm/src/embedding/openai-embeddings.ts
   export class OpenAIEmbeddingService implements EmbeddingService {
     private client: OpenAI;
     private model = 'text-embedding-3-small'; // 1536 dimensions

     async embed(texts: string[]): Promise<number[][]> {
       // Batch embedding with rate limiting
     }

     getDimensions(): number { return 1536; }
   }
   ```

2. **Qdrant Client Package** (`@minimal-rpg/retrieval` or new `@minimal-rpg/vector`)
   - Qdrant JS client wrapper
   - Collection management utilities
   - Type-safe payload schemas

3. **Context Assembly Service** (`@minimal-rpg/retrieval`)
   - Implement `DynamicContextAssembler` class
   - Wire into `CognitionLayer.decideLLM()`

### Phase 1: Setup & Backfill

1. **Provision Qdrant**
   - Local: Add to `config/docker/docker-compose.yml`
   - Production: Qdrant Cloud or self-hosted with persistence

2. **Create Collections** with schemas (see Collection Schemas section)

3. **Backfill Script** (`scripts/backfill-qdrant.mjs`)

   ```typescript
   // Batch processing with progress tracking
   async function backfill() {
     // 1. Entity profiles -> entities collection
     await backfillEntities();

     // 2. Locations -> entities collection (with parent_id hierarchy)
     await backfillLocations();

     // 3. Knowledge nodes -> memories collection
     await backfillMemories();

     // 4. Events -> events_vectors (group by episode, summarize)
     await backfillEpisodes();
   }
   ```

4. **Embedding Versioning**
   - Store `embedding_model` and `embedding_version` in payload metadata
   - Track in a `_migrations` collection for audit

### Phase 2: Dual Write (Transition)

Modify application logic in `@minimal-rpg/services` and repository layer:

- **Create/Update**: When entity saved to Postgres, emit event to WorldBus -> worker embeds and upserts to Qdrant
- **Delete**: Cascade delete to Qdrant via worker
- **Reads**: Continue using Postgres `embedding` column for stability

```typescript
// packages/workers/src/embedding-worker.ts
bus.subscribe('ENTITY_UPDATED', async (event) => {
  const { entityId, entityType } = event.payload;
  const entity = await entityRepo.getById(entityId);
  const embedding = await embeddingService.embed([entity.content]);
  await qdrantClient.upsert('entities', [{
    id: entityId,
    vector: embedding[0],
    payload: transformToPayload(entity)
  }]);
});
```

### Phase 3: Switch Reads & Integration

1. **Wire Retrieval into Cognition**
   - Update `CognitionLayer.decideLLM()` to use `DynamicContextAssembler`
   - Pass retrieved context as additional prompt sections

2. **Implement Re-ranking** (optional, for quality-critical paths)
   - Use lightweight cross-encoder model
   - Apply only to top-N candidates

3. **Enable Semantic Cache**
   - Start with conservative threshold (0.97)
   - Monitor cache hit rate and quality

### Phase 4: Cleanup & Optimization

- **Remove Postgres Embedding Columns**: Migration to drop `embedding` from tables
- **Remove pgvector Extension**: If no longer needed
- **Performance Tuning**: Adjust Qdrant index parameters based on dataset size
- **Monitoring**: Track retrieval latency, cache hit rates, LLM token usage

---

## Data Transformation Logic

### 1. Entity Profiles -> `entities`

- **Qdrant ID**: Same as Postgres `id`
- **Vector Content**: Concatenate `name` + `profileJson.summary` + `profileJson.appearance` + key traits
- **Payload**:

| Field | Source | Type |
|-------|--------|------|
| `entity_type` | `entityProfiles.entityType` | keyword |
| `name` | `entityProfiles.name` | keyword |
| `owner_email` | `entityProfiles.ownerEmail` | keyword |
| `visibility` | `entityProfiles.visibility` | keyword |
| `tier` | `entityProfiles.tier` | keyword |
| `tags` | `entityProfiles.tags` | keyword[] |
| `attributes` | `entityProfiles.profileJson` | JSON |
| `embedding_model` | `'text-embedding-3-small'` | keyword |
| `embedding_version` | Migration timestamp | integer |

### 2. Locations -> `entities`

- **Qdrant ID**: Same as Postgres `id`
- **Vector Content**: `name` + `description` + `summary` + `atmosphere.mood`
- **Payload**:

| Field | Source | Type |
|-------|--------|------|
| `entity_type` | `'location'` | keyword |
| `name` | `locations.name` | keyword |
| `location_type` | `locations.type` | keyword |
| `parent_id` | `locations.parentLocationId` | keyword |
| `setting_id` | `locations.settingId` | keyword |
| `attributes` | `locations.properties` merged with `locations.atmosphere` | JSON |

### 3. Knowledge Nodes -> `memories`

- **Qdrant ID**: Same as Postgres `id`
- **Vector Content**: `content` (primary) or `summary` if content is very long
- **Payload**:

| Field | Source | Type |
|-------|--------|------|
| `memory_type` | `knowledgeNodes.nodeType` | keyword |
| `actor_id` | `knowledgeNodes.actorId` | keyword |
| `session_id` | `knowledgeNodes.sessionId` | keyword |
| `owner_email` | `knowledgeNodes.ownerEmail` | keyword |
| `confidence` | `knowledgeNodes.confidence` | float |
| `importance` | `knowledgeNodes.importance` | float |
| `decay_rate` | `knowledgeNodes.decayRate` | float |
| `source_type` | `knowledgeNodes.sourceType` | keyword |
| `learned_at` | `knowledgeNodes.learnedAt` | integer (unix) |
| `last_recalled_at` | `knowledgeNodes.lastRecalledAt` | integer (unix) |
| `access_control_list` | Derived from session/owner | keyword[] |

### 4. Events -> `events_vectors`

- **Qdrant ID**: Generated UUID (one per episode)
- **Vector Content**: LLM-summarized episode (20-turn batches)
- **Payload**:

| Field | Source | Type |
|-------|--------|------|
| `session_id` | Event grouping | keyword |
| `is_summary` | `true` for summaries, `false` for raw | boolean |
| `event_types` | Array of event types in episode | keyword[] |
| `game_turn_start` | First event sequence | integer |
| `game_turn_end` | Last event sequence | integer |
| `actor_ids` | Unique actors in episode | keyword[] |
| `location_ids` | Unique locations in episode | keyword[] |

---

## Qdrant Collection Schemas

### Base Payload Schema (All Collections)

```typescript
interface BasePayload {
  // Identity
  id: string;                     // UUID matching PostgreSQL
  entity_type: string;            // Discriminator: 'character', 'location', 'item', 'memory', 'episode'
  name?: string;                  // Human-readable label

  // Ownership & Scoping
  session_id?: string;            // Runtime session scope (null = global)
  owner_email?: string;           // User ownership
  access_control_list?: string[]; // 'public' or specific user/actor IDs

  // Timestamps (Unix milliseconds)
  created_at: number;
  updated_at: number;

  // Versioning
  embedding_model: string;        // e.g., 'text-embedding-3-small'
  embedding_version: number;      // Migration timestamp for re-embedding tracking

  // Extensibility
  tags?: string[];
  attributes?: Record<string, unknown>;
}
```

### Collection: `entities`

Unified collection for characters, locations, and items.

```typescript
const entitiesCollectionConfig = {
  collection_name: 'entities',
  vectors: {
    size: 1536,
    distance: 'Cosine'
  },
  payload_schema: {
    entity_type: 'keyword',   // 'character', 'location', 'item', 'setting', 'faction'
    session_id: 'keyword',
    parent_id: 'keyword',     // Hierarchy: locations in regions, items in containers
    owner_email: 'keyword',
    visibility: 'keyword',    // 'public', 'private', 'session'
    tier: 'keyword',          // 'major', 'minor', 'background'
    tags: 'keyword',
    embedding_model: 'keyword',
    embedding_version: 'integer'
  }
};
```

### Collection: `memories`

Stores `knowledge_nodes` for NPC internal state.

```typescript
const memoriesCollectionConfig = {
  collection_name: 'memories',
  vectors: {
    size: 1536,
    distance: 'Cosine'
  },
  payload_schema: {
    session_id: 'keyword',
    actor_id: 'keyword',           // Which NPC owns this memory
    memory_type: 'keyword',        // 'fact', 'event', 'relationship', 'rumor', 'belief', 'memory'
    confidence: 'float',           // Trust level (rumors < facts)
    importance: 'float',           // Retrieval weight
    decay_rate: 'float',           // Memory fade rate
    source_type: 'keyword',        // 'witnessed', 'heard', 'inferred', 'told'
    learned_at: 'integer',         // Unix timestamp for recency
    last_recalled_at: 'integer',   // For importance boosting
    access_control_list: 'keyword',
    embedding_model: 'keyword',
    embedding_version: 'integer'
  }
};
```

### Collection: `events_vectors`

Stores episodic summaries and optionally raw events.

```typescript
const eventsVectorsCollectionConfig = {
  collection_name: 'events_vectors',
  vectors: {
    size: 1536,
    distance: 'Cosine'
  },
  payload_schema: {
    session_id: 'keyword',
    is_summary: 'boolean',         // True for LLM-summarized episodes
    event_types: 'keyword',        // Array of event types in episode
    game_turn_start: 'integer',
    game_turn_end: 'integer',
    actor_ids: 'keyword',          // Actors involved
    location_ids: 'keyword',       // Locations involved
    embedding_model: 'keyword',
    embedding_version: 'integer'
  }
};
```

### Collection: `dialogue`

Dedicated conversation history for high-fidelity dialogue retrieval.

```typescript
const dialogueCollectionConfig = {
  collection_name: 'dialogue',
  vectors: {
    size: 1536,
    distance: 'Cosine'
  },
  payload_schema: {
    session_id: 'keyword',
    speaker_actor_id: 'keyword',
    target_actor_id: 'keyword',
    location_id: 'keyword',
    turn_number: 'integer',
    timestamp: 'integer',
    embedding_model: 'keyword',
    embedding_version: 'integer'
  }
};
```

### Collection: `query_cache`

Semantic cache for reducing redundant inference.

```typescript
const queryCacheCollectionConfig = {
  collection_name: 'query_cache',
  vectors: {
    size: 1536,
    distance: 'Cosine'
  },
  payload_schema: {
    query_hash: 'keyword',         // MD5 of normalized query
    session_id: 'keyword',         // Optional session scope
    actor_id: 'keyword',           // Which actor's perspective
    context_hash: 'keyword',       // Hash of retrieved context
    response_tokens: 'integer',    // Response length for budgeting
    hit_count: 'integer',          // Usage tracking
    created_at: 'integer',
    expires_at: 'integer'          // TTL for automatic cleanup
  }
};
```

---

## Cold-Start & Fallback Strategies

### When Embeddings Don't Exist

1. **Graceful Degradation**: Fall back to keyword-based retrieval using Postgres `ILIKE` or full-text search
2. **Priority Embedding Queue**: New entities get embeddings within 1 turn via background worker
3. **Lazy Embedding**: Generate embedding on first retrieval query if missing

### Embedding Versioning

When embedding models change (e.g., switching from `text-embedding-3-small` to a new model):

1. Track `embedding_model` and `embedding_version` in each payload
2. Re-embedding migration script processes all points with old version
3. Filter queries can exclude stale embeddings: `Filter.must(FieldCondition('embedding_version', Range(gte=TARGET_VERSION)))`

### Rate Limiting & Quotas

- Batch embedding requests (max 16 texts per API call for OpenAI)
- Implement exponential backoff for rate limit errors
- Track daily embedding token usage per user
- Defer non-urgent embeddings to off-peak hours

---

## Future Enhancements

### 1. Active Learning / Feedback Loop

Allow GM/Players to implicitly rate retrieval quality:
- Track when users regenerate responses or edit out hallucinations
- Store negative feedback pairs for query-context combinations
- Periodically adjust ranking weights based on feedback patterns
- Optional: Fine-tune embedding model on domain-specific data

### 2. Multi-Modal Embeddings

Prepare for visual assets (maps, character portraits):
- Use CLIP or similar models to project images into shared vector space
- Enable queries like "Show NPCs that look intimidating"
- Store image embeddings alongside text embeddings using named vectors

### 3. Sparse-Dense Hybrid Search

Combine dense embeddings with sparse (BM25-style) vectors:
- Better handling of rare proper nouns and specific terms
- Qdrant supports named vectors - use `dense` + `sparse` vectors per point
- Retrieval: RRF (Reciprocal Rank Fusion) to combine results

### 4. Streaming Context Assembly

For long-running sessions:
- Stream retrieved context as it's found (don't wait for all queries)
- Progressive context building with early-exit on token budget
- Real-time relevance feedback loop

---

## Integration Points

### Packages to Modify

| Package | Changes |
|---------|---------|
| `@minimal-rpg/llm` | Add `EmbeddingService` implementation |
| `@minimal-rpg/retrieval` | Add `QdrantRetrievalService`, `DynamicContextAssembler` |
| `@minimal-rpg/workers` | Add `EmbeddingWorker` for background embedding jobs |
| `@minimal-rpg/actors` | Wire `CognitionLayer` to use `DynamicContextAssembler` |
| `@minimal-rpg/db` | Add Qdrant client initialization, migration scripts |
| `@minimal-rpg/api` | Expose retrieval metrics endpoint |

### New Files to Create

```text
packages/llm/src/embedding/
├── index.ts
├── openai-embeddings.ts
├── embedding-service.interface.ts
└── mock-embeddings.ts          # For testing

packages/retrieval/src/
├── qdrant/
│   ├── index.ts
│   ├── client.ts
│   ├── collections.ts
│   └── types.ts
├── context/
│   ├── index.ts
│   ├── dynamic-assembler.ts
│   ├── ranking.ts
│   └── deduplication.ts
└── cache/
    ├── index.ts
    └── semantic-cache.ts

packages/workers/src/
├── embedding-worker.ts
└── reembedding-migration.ts

scripts/
├── backfill-qdrant.mjs
└── verify-embeddings.mjs
```

### Docker Compose Addition

```yaml
# config/docker/docker-compose.yml
services:
  qdrant:
    image: qdrant/qdrant:v1.7.4
    ports:
      - "6333:6333"   # REST API
      - "6334:6334"   # gRPC
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334

volumes:
  qdrant_storage:
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Retrieval latency (p95) | < 100ms | Qdrant query time |
| Context relevance score | > 0.7 | Manual evaluation sample |
| Cache hit rate | > 30% | `query_cache` hits / total queries |
| Token reduction | > 40% | Tokens sent vs. fixed context baseline |
| Cold-start embedding time | < 2s | Time from entity create to embedding available |
| Embedding API cost | Track | Daily token usage dashboard |
