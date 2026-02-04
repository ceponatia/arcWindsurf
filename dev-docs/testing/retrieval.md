# Retrieval Package Test Coverage Review

## Scope

Package: `@minimal-rpg/retrieval`

Focus: extraction, scoring, in-memory retrieval service, and sensory modifier loader.

## Existing Tests

- `test/extraction.test.ts`
  - Covers `getPathImportance`, `getValueAtPath`, `valueToContent` conversions.
  - Validates `extractNodes` with custom paths and defaults, `createKnowledgeNode` metadata, `nodeContentChanged`, and `diffNodes` outcomes.
- `test/scoring.test.ts`
  - Covers `cosineSimilarity` including mismatch errors, zero magnitude, and normalized cases.
  - Covers `computeTotalImportance`, `computeScore`, `scoreNode`, `scoreAndRankNodes`, `filterByMinScore`, `applyNarrativeDecay`, `boostNarrativeImportance`, and `DEFAULT_SCORING_WEIGHTS`.
- `test/service.test.ts`
  - Covers `NodeStore` set/get/index/delete/clear and ID generation.
  - Covers `InMemoryRetrievalService.ingestNodes` creation and update flows with embeddings.
  - Covers `retrieve` ranking/limits, and no-embedding fallback.
  - Covers `updateSalience` and `applyDecay` behavior.
- `test/service-advanced.test.ts`
  - Covers embedding service usage when query embedding is missing.
  - Covers default vs override behavior for `maxNodes`/`minScore`.
  - Covers index cleanup after node deletion.
- `test/sensory-modifiers.test.ts`
  - Covers loader parsing, returned helpers, and modifier lookup.
- `test/sensory-modifiers.errors.test.ts`
  - Covers missing file and schema validation failures.

## Notably Untested or Under-tested Areas

### Extraction

- No tests for `extractNodes` error handling when `getValueAtPath` throws (rare, but possible with custom getters).
- No tests for `getPathImportance` with prefix matches on deeper paths beyond the single coverage in extraction tests.

### Scoring

- No tests for `cosineSimilarity` clamping on floating point precision beyond basic cases.
- `scoreAndRankNodes` has no stability tests for equal scores.

### Retrieval Service

- No tests for `retrieve` when both `characterInstanceId` and `settingInstanceId` are provided (combined candidates).
- No tests for `ingestNodes` when neither character nor setting id is provided (falls back to empty existing list).
- No tests for `ingestNodes` when `paths` are omitted for character vs setting default paths.
- No tests for `applyDecay` when narrative importance is already zero.
- No tests for `updateSalience` when node ids are missing.

### Loader

- No tests for `loadSensoryModifiers` default data dir resolution (`DATA_DIR` env vs cwd fallback).

## Suggested Test Additions (Prioritized)

1. Retrieval service combined candidate behavior and empty-id ingest flows.
2. Sensory modifiers loader default path resolution using `DATA_DIR`.
3. Extraction prefix matching and error path coverage for `getPathImportance` and `extractNodes`.

## Notes

- `scoring/types.ts`, `services/types.ts`, and `utils/types.ts` are placeholders and have no behavior to test.
