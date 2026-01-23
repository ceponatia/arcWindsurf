# @minimal-rpg/retrieval

## Purpose

Knowledge retrieval and semantic search. Converts profile JSON into knowledge nodes, scores them against queries, and returns ranked context for turns.

## Scope

- Knowledge node extraction from character/setting profiles
- Embedding-aware scoring, salience boosts, and narrative decay
- Retrieval services for querying and ranking nodes
- Node diffing and ingestion workflows
- Sensory modifier loader for hygiene-dependent scent/touch/taste text

## Package Connections

- **db**: Planned persistence layer for knowledge nodes and embeddings
- **schemas**: Uses shared node/profile types and sensory modifier schemas
- **governor**: Invokes retrieval to build turn context
- **characters**: Provides profiles that are converted to nodes

## Imports and Exports

Public entry is [packages/retrieval/src/index.ts](packages/retrieval/src/index.ts). It re-exports:

- Types from [packages/retrieval/src/types.ts](packages/retrieval/src/types.ts)
- Loader: `loadSensoryModifiers` from [packages/retrieval/src/loaders/sensory-modifiers.ts](packages/retrieval/src/loaders/sensory-modifiers.ts)
- Scoring utilities from [packages/retrieval/src/scoring](packages/retrieval/src/scoring)
- Extraction utilities from [packages/retrieval/src/extraction](packages/retrieval/src/extraction)
- Service implementations from [packages/retrieval/src/services](packages/retrieval/src/services)

## Core Types and Interfaces

Defined in [packages/retrieval/src/types.ts](packages/retrieval/src/types.ts):

- `KnowledgeNode`
- `RetrievalQuery`
- `ScoredNode`
- `RetrievalResult`, `RetrievalMetadata`
- `ScoringWeights`, `RetrievalConfig`
- `NodeIngestionInput`, `NodeIngestionResult`, `NodeIngestionError`
- `RetrievalService` interface
- `EmbeddingService` interface

## Modules and Classes

### Extraction

File: [packages/retrieval/src/extraction/extraction.ts](packages/retrieval/src/extraction/extraction.ts)

- Constants: `DEFAULT_CHARACTER_PATHS`, `DEFAULT_SETTING_PATHS`
- Functions: `getPathImportance()`, `getValueAtPath()`, `valueToContent()`, `extractNodes()`,
 `createKnowledgeNode()`, `nodeContentChanged()`, `diffNodes()`
- Types: `ExtractedNode`, `NodeUpdatePair`, `NodeDiff` in
 [packages/retrieval/src/extraction/types.ts](packages/retrieval/src/extraction/types.ts)

### Scoring

File: [packages/retrieval/src/scoring/scoring.ts](packages/retrieval/src/scoring/scoring.ts)

- Constants: `DEFAULT_SCORING_WEIGHTS`
- Functions: `cosineSimilarity()`, `computeTotalImportance()`, `computeScore()`, `scoreNode()`,
 `scoreAndRankNodes()`, `filterByMinScore()`, `applyNarrativeDecay()`, `boostNarrativeImportance()`

### Services

File: [packages/retrieval/src/services/retrieval-service.ts](packages/retrieval/src/services/retrieval-service.ts)

- Class: `NodeStore`
- Class: `InMemoryRetrievalService`
- Constant: `DEFAULT_RETRIEVAL_CONFIG`

### Loaders

File: [packages/retrieval/src/loaders/sensory-modifiers.ts](packages/retrieval/src/loaders/sensory-modifiers.ts)

- Function: `loadSensoryModifiers()`
- Interface: `LoadedSensoryModifiers`

## Usage Notes

- `InMemoryRetrievalService` is the default implementation for tests and local usage.
- Embedding-aware retrieval depends on an injected `EmbeddingService`.
- Sensory modifiers are loaded from `sensory-modifiers.json` and validated by schemas.
