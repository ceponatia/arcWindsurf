# PostgreSQL to Qdrant Migration Plan

## Overview

This document outlines the migration strategy from PostgreSQL (with pgvector) to Qdrant for vector storage and semantic search, along with comprehensive schema designs for all game entities optimized for vector database operations.

### Goals

1. **Semantic Search at Scale** - Fast, accurate similarity search across NPC memories, world state, and entity attributes
2. **Rich Metadata Filtering** - Complex queries combining vector similarity with structured filters
3. **Entity Relationships** - Robust parent-child and cross-entity linking via payload references
4. **Extensibility** - Schemas designed for expansion without migrations or refactoring
5. **Hybrid Architecture** - PostgreSQL remains source of truth for relational data; Qdrant handles vector search

---

## Architecture Decision: Hybrid PostgreSQL + Qdrant

### What Stays in PostgreSQL

| Data Type | Reason |
|-----------|--------|
| User accounts, sessions, authentication | ACID transactions, referential integrity |
| Event sourcing (events table) | Ordered sequences, foreign key cascades |
| Location graph topology | Complex joins, bidirectional relationships |
| Inventory/ownership relations | Transactional updates, cascading deletes |
| Session projections (JSONB) | Real-time state, frequent updates |

### What Moves to Qdrant

| Data Type | Reason |
|-----------|--------|
| Knowledge nodes (NPC memories) | Vector similarity, decay/salience |
| Entity profile embeddings | Semantic search across characters, items, locations |
| World state snapshots | Temporal queries, context retrieval |
| Dialogue/event embeddings | Conversation history search |
| Relationship sentiment vectors | Affinity-based retrieval |

---

## Migration Strategy

### Phase 1: Parallel Write (Shadow Mode)

```text
┌─────────────────┐     ┌─────────────────┐
│   Application   │────▶│   PostgreSQL    │ (primary)
│                 │────▶│     Qdrant      │ (shadow write)
└─────────────────┘     └─────────────────┘
         │
         └── Reads still from PostgreSQL
```

- All writes go to both databases
- Reads remain PostgreSQL-only
- Compare results for consistency validation
- Duration: 2-4 weeks

### Phase 2: Read Migration

```text
┌─────────────────┐     ┌─────────────────┐
│   Application   │────▶│   PostgreSQL    │ (relational)
│                 │────▶│     Qdrant      │ (vector search)
└─────────────────┘     └─────────────────┘
         │
         └── Vector queries → Qdrant
         └── Relational queries → PostgreSQL
```

- Vector similarity queries routed to Qdrant
- PostgreSQL handles relational queries
- Feature flag for gradual rollout

### Phase 3: Cleanup

- Remove `embedding` columns from PostgreSQL tables
- Drop pgvector extension (optional)
- Archive migration code

---

## Qdrant Collection Schemas

### Design Principles

1. **UUID Point IDs** - Match PostgreSQL primary keys for cross-referencing
2. **Typed Payloads** - Consistent `entity_type` field for filtering
3. **Parent References** - `parent_id` and `parent_type` for hierarchical relationships
4. **Session Scoping** - `session_id` for runtime isolation
5. **Extensible Metadata** - `attributes` object for type-specific data without schema changes
6. **Temporal Fields** - `created_at`, `updated_at`, `expires_at` for TTL and history

### Base Payload Schema (All Collections)

```typescript
interface BasePayload {
  // Identity
  id: string;                    // UUID matching PostgreSQL
  entity_type: string;           // Discriminator for polymorphic queries
  name: string;                  // Human-readable label

  // Ownership & Scoping
  owner_email: string;           // User ownership
  session_id?: string;           // Runtime session scope (null = template/global)
  visibility: 'public' | 'private' | 'session';

  // Hierarchy
  parent_id?: string;            // Parent entity UUID
  parent_type?: string;          // Parent entity type

  // Timestamps
  created_at: number;            // Unix timestamp
  updated_at: number;            // Unix timestamp
  expires_at?: number;           // TTL for ephemeral data

  // Extensibility
  tags: string[];                // Filterable tags
  attributes: Record<string, unknown>;  // Type-specific data
}
```

---

## Collection: `entities`

**Purpose**: Unified collection for all searchable game entities (characters, locations, items, settings, factions).

### Why Unified?

- Cross-entity semantic search ("find anything related to fire magic")
- Simpler operational management
- `entity_type` filter for scoped queries
- Shared embedding model

### Payload Schema

```typescript
interface EntityPayload extends BasePayload {
  entity_type:
    | 'character'      // NPCs, player characters
    | 'location'       // Rooms, buildings, regions
    | 'item'           // Equipment, consumables, artifacts
    | 'setting'        // World/campaign settings
    | 'faction'        // Organizations, guilds
    | 'persona';       // AI personality templates

  // Content for embedding
  content: string;              // Primary text (description, summary)
  summary?: string;             // Short version for UI

  // Character-specific
  tier?: 'major' | 'minor' | 'background' | 'transient';
  species?: string;
  occupation?: string;

  // Location-specific
  location_type?: 'region' | 'building' | 'room';
  coordinates?: { x: number; y: number };

  // Item-specific
  item_category?: 'clothing' | 'weapon' | 'trinket' | 'accessory' | 'consumable' | 'generic';
  equipped_by?: string;         // Character ID
  contained_in?: string;        // Location or container ID
  slot?: string;                // Equipment slot

  // Relationships (stored as arrays for multi-indexing)
  related_entity_ids: string[];

  // Semantic tags for filtering
  semantic_tags: string[];      // ['magical', 'ancient', 'dangerous']
}
```

### Indexes

```typescript
// Qdrant collection config
{
  collection_name: "entities",
  vectors: {
    size: 1536,  // OpenAI ada-002
    distance: "Cosine"
  },
  payload_schema: {
    entity_type: "keyword",
    session_id: "keyword",
    owner_email: "keyword",
    parent_id: "keyword",
    parent_type: "keyword",
    tier: "keyword",
    location_type: "keyword",
    item_category: "keyword",
    equipped_by: "keyword",
    contained_in: "keyword",
    tags: "keyword",
    semantic_tags: "keyword",
    visibility: "keyword",
    created_at: "integer",
    updated_at: "integer"
  }
}
```

---

## Collection: `memories`

**Purpose**: Long-term NPC memories, beliefs, and learned knowledge with decay and salience tracking.

### Payload Schema

```typescript
interface MemoryPayload extends BasePayload {
  entity_type: 'memory';

  // Memory classification
  memory_type:
    | 'fact'          // Objective knowledge
    | 'event'         // Witnessed or participated in
    | 'relationship'  // Knowledge about another entity
    | 'rumor'         // Heard from others (lower confidence)
    | 'belief'        // Personal interpretation
    | 'emotion'       // Emotional memory/association
    | 'skill';        // Learned ability or technique

  // Owner (NPC or location that "knows" this)
  actor_id: string;              // Character instance ID
  actor_type: 'npc' | 'player' | 'location' | 'faction';

  // Content
  content: string;               // Full memory text
  summary?: string;              // Compressed version

  // Source tracking
  source_type: 'witnessed' | 'heard' | 'inferred' | 'told' | 'innate';
  source_entity_id?: string;     // Who told them / what they witnessed
  source_event_id?: string;      // Linked event UUID

  // Salience & Decay
  confidence: number;            // 0-1, how certain the actor is
  importance: number;            // 0-1, base importance
  narrative_importance: number;  // 0-1, boosted by recent relevance
  decay_rate: number;            // Per-turn decay factor
  access_count: number;          // Times retrieved

  // Temporal
  learned_at: number;            // When memory was formed
  last_recalled_at?: number;     // Last retrieval timestamp

  // Subject references (what/who the memory is about)
  subject_ids: string[];         // Entity IDs this memory concerns
  subject_types: string[];       // Types of those entities

  // Emotional valence
  sentiment?: number;            // -1 to 1 (negative to positive)
  emotional_tags?: string[];     // ['fear', 'joy', 'anger']
}
```

### Indexes

```typescript
{
  collection_name: "memories",
  vectors: {
    size: 1536,
    distance: "Cosine"
  },
  payload_schema: {
    session_id: "keyword",
    actor_id: "keyword",
    actor_type: "keyword",
    memory_type: "keyword",
    source_type: "keyword",
    subject_ids: "keyword",
    confidence: "float",
    importance: "float",
    narrative_importance: "float",
    learned_at: "integer",
    last_recalled_at: "integer",
    sentiment: "float",
    emotional_tags: "keyword"
  }
}
```

### Memory Decay Algorithm

```typescript
// Applied each game turn or real-time interval
function applyMemoryDecay(memory: MemoryPayload): MemoryPayload {
  const turnsSinceAccess = getCurrentTurn() - memory.last_recalled_at;
  const decayFactor = Math.pow(1 - memory.decay_rate, turnsSinceAccess);

  return {
    ...memory,
    narrative_importance: memory.narrative_importance * decayFactor,
    // Base importance never decays
  };
}
```

---

## Collection: `world_state`

**Purpose**: Snapshots of world/location state for temporal queries and context retrieval.

### Payload Schema

```typescript
interface WorldStatePayload extends BasePayload {
  entity_type: 'world_state';

  // Scope
  state_type:
    | 'location_state'    // Current state of a location
    | 'global_state'      // World-wide conditions
    | 'faction_state'     // Faction status/relations
    | 'weather'           // Environmental conditions
    | 'time_period';      // In-game time context

  // References
  location_id?: string;
  faction_id?: string;

  // Content
  content: string;              // Narrative description of state

  // Structured state data
  state_data: {
    // Location state
    occupants?: string[];       // Entity IDs present
    atmosphere?: string;        // 'tense', 'peaceful', 'chaotic'
    lighting?: string;          // 'bright', 'dim', 'dark'
    noise_level?: string;       // 'quiet', 'moderate', 'loud'

    // Global state
    time_of_day?: string;
    weather?: string;
    season?: string;

    // Faction state
    reputation?: Record<string, number>;  // faction_id -> reputation
    active_conflicts?: string[];

    // Custom state
    [key: string]: unknown;
  };

  // Temporal
  game_turn?: number;
  game_time?: string;           // In-game timestamp

  // Validity
  valid_from: number;
  valid_until?: number;         // When superseded
}
```

---

## Collection: `relationships`

**Purpose**: Entity-to-entity relationships with typed connections and sentiment tracking.

### Payload Schema

```typescript
interface RelationshipPayload extends BasePayload {
  entity_type: 'relationship';

  // Endpoints (unidirectional: from → to)
  from_entity_id: string;
  from_entity_type: string;
  to_entity_id: string;
  to_entity_type: string;

  // Relationship classification
  relationship_type:
    | 'knows'           // Basic awareness
    | 'family'          // Blood/adoptive relation
    | 'friend'          // Positive social bond
    | 'rival'           // Competitive relationship
    | 'enemy'           // Hostile relationship
    | 'employer'        // Work hierarchy
    | 'employee'
    | 'mentor'
    | 'student'
    | 'romantic'
    | 'owns'            // Ownership (character → item)
    | 'located_in'      // Spatial containment
    | 'member_of'       // Faction membership
    | 'allied_with'     // Faction alliance
    | 'custom';         // User-defined

  // Relationship metadata
  relationship_label?: string;  // Custom label for 'custom' type

  // Affinity dimensions (character relationships)
  affinity?: {
    trust: number;        // -100 to 100
    respect: number;
    affection: number;
    fear: number;
    familiarity: number;  // 0 to 100
  };

  // Content for semantic search
  content: string;              // "Alice deeply trusts Bob after..."

  // Bidirectional flag
  bidirectional: boolean;
  reciprocal_id?: string;       // ID of reverse relationship

  // Temporal
  established_at?: number;
  last_interaction_at?: number;
}
```

---

## Collection: `dialogue`

**Purpose**: Conversation history and significant utterances for context retrieval.

### Payload Schema

```typescript
interface DialoguePayload extends BasePayload {
  entity_type: 'dialogue';

  // Context
  speaker_id: string;
  speaker_type: 'npc' | 'player' | 'narrator' | 'system';
  speaker_name: string;

  // Optional listener (for direct address)
  listener_id?: string;
  listener_type?: string;

  // Location context
  location_id?: string;

  // Content
  content: string;              // The actual dialogue

  // Classification
  dialogue_type:
    | 'speech'          // Normal dialogue
    | 'thought'         // Internal monologue
    | 'action'          // Described action
    | 'narration'       // GM/narrator text
    | 'system';         // System messages

  // Metadata
  turn_number: number;
  event_sequence: number;       // Links to events table

  // Sentiment & Intent
  sentiment?: number;           // -1 to 1
  intent?: string;              // 'greeting', 'threat', 'question', etc.
  topics: string[];             // Extracted topics

  // Mentioned entities
  mentioned_entity_ids: string[];
}
```

---

## Collection: `events_vectors`

**Purpose**: Searchable event history for narrative context and causality chains.

### Payload Schema

```typescript
interface EventVectorPayload extends BasePayload {
  entity_type: 'event_vector';

  // Link to PostgreSQL event
  event_id: string;             // UUID from events table
  sequence: number;

  // Event classification
  event_type: string;           // 'SPOKE', 'MOVED', 'TICK', 'COMBAT', etc.

  // Participants
  actor_id: string;
  actor_type: string;
  target_ids?: string[];

  // Location
  location_id?: string;

  // Content (narrative description)
  content: string;

  // Causality
  caused_by_event_id?: string;
  triggered_events?: string[];

  // Significance
  significance: 'trivial' | 'minor' | 'moderate' | 'major' | 'critical';

  // Game time
  game_turn: number;
  game_time?: string;
}
```

---

## Hierarchical Relationships

### Location Hierarchy

```text
Region (e.g., "Kingdom of Eldoria")
  └── Building (e.g., "Castle Blackstone")
        └── Room (e.g., "Throne Room")
              └── Sub-location (e.g., "Behind the Throne")
```

**Query**: Find all locations within a building

```typescript
qdrant.scroll({
  collection_name: "entities",
  filter: {
    must: [
      { key: "entity_type", match: { value: "location" }},
      { key: "parent_id", match: { value: buildingId }},
    ]
  }
});
```

### Item Containment

```text
Location (e.g., "Treasure Vault")
  └── Container (e.g., "Ancient Chest")
        └── Item (e.g., "Enchanted Sword")

Character (e.g., "Sir Galahad")
  └── Equipped (e.g., "Enchanted Sword")
  └── Inventory (e.g., "Health Potion")
```

**Query**: Find all items equipped by a character

```typescript
qdrant.scroll({
  collection_name: "entities",
  filter: {
    must: [
      { key: "entity_type", match: { value: "item" }},
      { key: "equipped_by", match: { value: characterId }},
    ]
  }
});
```

### NPC Memory Ownership

```text
NPC (e.g., "Innkeeper Martha")
  └── Memory: "Witnessed the theft"
  └── Memory: "Knows the king's secret"
  └── Memory: "Feels fear towards dragons"
```

**Query**: Retrieve NPC memories about a topic

```typescript
qdrant.search({
  collection_name: "memories",
  query_vector: await embed("dragon attack"),
  filter: {
    must: [
      { key: "actor_id", match: { value: npcId }},
      { key: "session_id", match: { value: sessionId }},
    ]
  },
  limit: 10
});
```

---

## Cross-Entity Queries

### Semantic Search Across All Entities

```typescript
// "Find anything related to ancient magic"
const results = await qdrant.search({
  collection_name: "entities",
  query_vector: await embed("ancient magic artifacts rituals"),
  filter: {
    must: [
      { key: "session_id", match: { value: sessionId }},
    ]
  },
  limit: 20
});
// Returns mix of characters, items, locations matching the query
```

### Context Assembly for LLM

```typescript
async function assembleContext(sessionId: string, query: string) {
  const queryVector = await embed(query);

  // Parallel searches across collections
  const [entities, memories, worldState, recentDialogue] = await Promise.all([
    qdrant.search({
      collection_name: "entities",
      query_vector: queryVector,
      filter: { must: [{ key: "session_id", match: { value: sessionId }}]},
      limit: 10
    }),
    qdrant.search({
      collection_name: "memories",
      query_vector: queryVector,
      filter: { must: [{ key: "session_id", match: { value: sessionId }}]},
      limit: 15
    }),
    qdrant.search({
      collection_name: "world_state",
      query_vector: queryVector,
      filter: {
        must: [
          { key: "session_id", match: { value: sessionId }},
          { key: "valid_until", match: { value: null }}  // Current state
        ]
      },
      limit: 5
    }),
    qdrant.search({
      collection_name: "dialogue",
      query_vector: queryVector,
      filter: { must: [{ key: "session_id", match: { value: sessionId }}]},
      limit: 10
    })
  ]);

  return { entities, memories, worldState, recentDialogue };
}
```

---

## Extensibility Patterns

### Adding New Entity Types

New entity types require **zero schema changes**:

1. Add new value to `entity_type` enum in TypeScript
2. Use `attributes` object for type-specific data
3. Add optional indexed fields only if filtering is required

```typescript
// Example: Adding "quest" entity type
const questEntity: EntityPayload = {
  id: uuid(),
  entity_type: 'quest',  // New type, no migration needed
  name: 'The Lost Artifact',
  content: 'Find the ancient relic hidden in the catacombs...',
  tags: ['main_quest', 'exploration'],
  attributes: {
    // Quest-specific data in extensible attributes
    quest_giver_id: 'npc-123',
    objectives: ['Find the map', 'Enter the catacombs', 'Retrieve the relic'],
    reward_xp: 500,
    difficulty: 'medium'
  },
  // ... base fields
};
```

### Adding New Memory Types

```typescript
// Example: Adding "trauma" memory type
const traumaMemory: MemoryPayload = {
  entity_type: 'memory',
  memory_type: 'trauma',  // New type
  content: 'The screams from the village fire still echo...',
  emotional_tags: ['fear', 'guilt', 'loss'],
  sentiment: -0.8,
  attributes: {
    // Trauma-specific
    trigger_topics: ['fire', 'screaming', 'village'],
    coping_mechanism: 'avoidance',
    intensity: 0.9
  },
  // ... other fields
};
```

### Schema Versioning

Include version in attributes for gradual migrations:

```typescript
interface VersionedPayload extends BasePayload {
  attributes: {
    _schema_version: number;  // e.g., 1, 2, 3
    // ... other attributes
  };
}

// Migration function
function migratePayload(payload: VersionedPayload): VersionedPayload {
  const version = payload.attributes._schema_version || 1;

  if (version < 2) {
    // Apply v1 → v2 migration
    payload.attributes.new_field = computeFromOldFields(payload);
  }

  if (version < 3) {
    // Apply v2 → v3 migration
    // ...
  }

  payload.attributes._schema_version = CURRENT_VERSION;
  return payload;
}
```

---

## Data Synchronization

### PostgreSQL → Qdrant Sync

```typescript
// Event-driven sync via database triggers or application events
interface SyncEvent {
  operation: 'upsert' | 'delete';
  collection: string;
  entity_id: string;
  payload?: unknown;
  vector?: number[];
}

// Sync service
class QdrantSyncService {
  async handleEntityChange(event: SyncEvent) {
    if (event.operation === 'delete') {
      await this.qdrant.delete(event.collection, {
        points: [event.entity_id]
      });
    } else {
      const vector = event.vector || await this.embed(event.payload.content);
      await this.qdrant.upsert(event.collection, {
        points: [{
          id: event.entity_id,
          vector: vector,
          payload: event.payload
        }]
      });
    }
  }
}
```

### Consistency Guarantees

1. **Eventual Consistency** - Qdrant updates may lag PostgreSQL by seconds
2. **Idempotent Writes** - Use upsert operations for retry safety
3. **Deletion Cascade** - Application layer handles related deletions
4. **Reconciliation Job** - Periodic full sync for drift detection

---

## Performance Considerations

### Indexing Strategy

| Field | Index Type | Use Case |
|-------|------------|----------|
| `session_id` | Keyword | Session isolation (most queries) |
| `entity_type` | Keyword | Type filtering |
| `parent_id` | Keyword | Hierarchy traversal |
| `actor_id` | Keyword | Memory ownership |
| `created_at` | Integer Range | Temporal queries |
| `importance` | Float Range | Salience filtering |
| `tags` | Keyword (array) | Categorical filtering |

### Query Optimization

```typescript
// Bad: Unscoped query
await qdrant.search({
  collection_name: "memories",
  query_vector: vector,
  limit: 100  // Scans entire collection
});

// Good: Scoped with filters
await qdrant.search({
  collection_name: "memories",
  query_vector: vector,
  filter: {
    must: [
      { key: "session_id", match: { value: sessionId }},
      { key: "actor_id", match: { value: npcId }},
      { key: "importance", range: { gte: 0.3 }}
    ]
  },
  limit: 20
});
```

### Batch Operations

```typescript
// Ingest multiple entities efficiently
await qdrant.upsert({
  collection_name: "entities",
  points: entities.map(e => ({
    id: e.id,
    vector: e.embedding,
    payload: e
  })),
  wait: false  // Async for better throughput
});
```

---

## Migration Checklist

### Pre-Migration

- [ ] Qdrant cluster provisioned and configured
- [ ] Collection schemas created with indexes
- [ ] Sync service implemented and tested
- [ ] Rollback plan documented

### Phase 1: Shadow Write

- [ ] Enable dual-write to PostgreSQL and Qdrant
- [ ] Monitor write latency and error rates
- [ ] Validate data consistency (sampling)
- [ ] Run for 2+ weeks

### Phase 2: Read Migration

- [ ] Feature flag for Qdrant reads
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Compare result quality with PostgreSQL
- [ ] Monitor query latency

### Phase 3: Cleanup

- [ ] Disable PostgreSQL vector reads
- [ ] Schedule embedding column removal
- [ ] Update documentation
- [ ] Archive migration code

---

## Next Steps

1. **Detailed Collection Schemas** - TypeScript interfaces for each collection
2. **Sync Service Implementation** - Event-driven PostgreSQL → Qdrant sync
3. **Retrieval Service Refactor** - Update `@minimal-rpg/retrieval` to use Qdrant
4. **Migration Scripts** - Backfill existing data to Qdrant
5. **Performance Benchmarks** - Compare pgvector vs Qdrant latency/throughput
