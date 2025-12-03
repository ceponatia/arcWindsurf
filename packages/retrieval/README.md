# @minimal-rpg/retrieval

This package handles knowledge node retrieval and scoring for Minimal RPG. It provides semantic search over decomposed profile data using vector embeddings and salience tracking.

## Overview

Instead of passing entire character/setting profiles to the LLM on every turn, this package:

1. **Decomposes profiles into knowledge nodes** - focused chunks with well-defined meanings (e.g., `appearance.hair`, `personality.traits`)
2. **Embeds nodes** - vector representations for semantic search
3. **Retrieves relevant nodes** - based on player input and context
4. **Scores by relevance + salience** - balancing what's asked vs. what's narratively important

## Core Concepts

### Knowledge Nodes

A knowledge node represents a focused piece of information:

- **Path**: JSON path in source profile (e.g., `appearance.eyes`)
- **Content**: Human-readable text (e.g., "Bright green eyes with gold flecks")
- **Embedding**: Vector representation for similarity search
- **Salience**: Base importance + narrative importance (decays over time)

### Scoring Model

Nodes are scored by combining:

$$
\text{Score} = (w_1 \times \text{Similarity}) + (w_2 \times \text{TotalImportance})
$$

Where:

- `Similarity` = cosine similarity between query and node embeddings
- `TotalImportance` = `baseImportance` + `narrativeImportance`
- Default weights: `w1 = 0.7`, `w2 = 0.3`

### Salience Tracking

- **Base importance**: Intrinsic weight (e.g., "cursed amulet" > "hair color")
- **Narrative importance**: Dynamic boost from story events
- **Decay**: Narrative importance decays each turn to let old facts fade
- **Boost**: Governor/agents can boost nodes when events make them important

## Usage

### Scoring Functions

```ts
import {
  cosineSimilarity,
  scoreNode,
  scoreAndRankNodes,
  filterByMinScore,
  applyNarrativeDecay,
  boostNarrativeImportance,
  DEFAULT_SCORING_WEIGHTS,
} from '@minimal-rpg/retrieval';

// Cosine similarity between embeddings
const similarity = cosineSimilarity([1, 0, 0], [0.8, 0.6, 0]);

// Score a single node
const scored = scoreNode(node, 0.85, DEFAULT_SCORING_WEIGHTS);

// Score and rank multiple nodes
const ranked = scoreAndRankNodes(nodes, [0.9, 0.8, 0.7], { similarity: 0.7, importance: 0.3 });

// Filter low-scoring results
const filtered = filterByMinScore(ranked, 0.3);
```

### Node Extraction

```ts
import {
  extractNodes,
  diffNodes,
  DEFAULT_CHARACTER_PATHS,
  DEFAULT_SETTING_PATHS,
} from '@minimal-rpg/retrieval';

// Extract nodes from a character profile
const extracted = extractNodes(characterProfile, DEFAULT_CHARACTER_PATHS);

// Create knowledge nodes from extracted data
const nodes = extracted.map((e) =>
  createKnowledgeNode({
    path: e.path,
    content: e.content,
    baseImportance: e.importance,
    characterInstanceId: 'char-123',
  })
);

// Diff old vs new nodes to find changes
const diff = diffNodes(oldNodes, newNodes);
console.log(diff.created, diff.updated, diff.unchanged);
```

### InMemoryRetrievalService

```ts
import { InMemoryRetrievalService } from '@minimal-rpg/retrieval';

// Create service (optionally with embedding service)
const service = new InMemoryRetrievalService();

// Ingest nodes from a profile
await service.ingestNodes({
  characterInstanceId: 'char-123',
  profileJson: characterProfile,
  paths: DEFAULT_CHARACTER_PATHS,
});

// Retrieve relevant nodes for a query
const result = await service.retrieve({
  sessionId: 'session-1',
  queryText: 'What does the character look like?',
  queryEmbedding: [0.1, 0.2, ...], // optional
  characterInstanceId: 'char-123',
  maxNodes: 10,
  minScore: 0.2,
});

// Boost importance of accessed nodes
await service.updateSalience(['node-1', 'node-2'], 0.3);

// Apply decay to all nodes (call each turn)
await service.applyDecay();
```

### With Embedding Service

```ts
import { InMemoryRetrievalService, EmbeddingService } from '@minimal-rpg/retrieval';

const embeddingService: EmbeddingService = {
  embed: async (texts) => {
    // Call your embedding API (OpenAI, etc.)
    return texts.map(() => new Array(1536).fill(0));
  },
  getDimensions: () => 1536,
};

const service = new InMemoryRetrievalService({}, embeddingService);

// Now ingestion and retrieval will compute embeddings automatically
```

## Services

### RetrievalService

Main interface for querying knowledge nodes:

- `retrieve(query)`: Get scored nodes for a query
- `ingestNodes(input)`: Create/update nodes from a profile
- `updateSalience(nodeIds, boost)`: Boost importance of accessed nodes
- `applyDecay(sessionId)`: Apply decay factor to narrative importance

### EmbeddingService

Interface for computing vector embeddings:

- `embed(texts)`: Compute embeddings for text strings
- `getDimensions()`: Get embedding dimensionality

## Relationship to Other Packages

- **Governor**: Invokes retrieval to build context for agents
- **State Manager**: Source of truth for profile data; retrieval derives nodes from it
- **Agents**: Receive knowledge context in their input
- **DB**: Retrieval queries the `profile_nodes` table (once created)

## Database Schema (Proposed)

The knowledge node table does not exist yet. When implemented:

```sql
CREATE TABLE profile_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_instance_id TEXT REFERENCES character_instances(id),
  setting_instance_id TEXT REFERENCES setting_instances(id),
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  base_importance FLOAT DEFAULT 0.5,
  narrative_importance FLOAT DEFAULT 0.0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (character_instance_id, setting_instance_id, path)
);
```

## Status

This package provides an in-memory implementation of the retrieval service. Key components:

- ✅ **Scoring utilities** - cosine similarity, scoring, decay, boost
- ✅ **Node extraction** - extract nodes from profiles, diffing
- ✅ **InMemoryRetrievalService** - full in-memory implementation
- ⏳ **PgVectorRetrievalService** - database-backed implementation (future)
