# TASK-003: Wire LLM to /studio/infer-traits Endpoint

**Priority**: P0
**Estimate**: 2-3 hours
**Depends On**: TASK-001
**Category**: Character Studio LLM Integration

---

## Objective

Replace the empty traits response in `/studio/infer-traits` with LLM-powered trait inference.

## File to Modify

`packages/api/src/routes/studio.ts`

## Current State

```typescript
// Lines 49-51
// TODO: Use LLM to infer traits
// For now, return empty array
return c.json({ traits: [] });
```

## Implementation Steps

1. Import `TraitInferenceEngine` from `@minimal-rpg/actors`
2. Instantiate the engine with the configured `llmProvider`
3. Call `engine.inferFromExchange(userMessage, characterResponse, profile)`
4. Persist inferred traits to the session
5. Return inferred traits to the client

## Code Structure

```typescript
import { TraitInferenceEngine } from '@minimal-rpg/actors';

app.post('/studio/infer-traits', async (c) => {
  // ... validation ...

  const engine = new TraitInferenceEngine({ llmProvider });
  const inferredTraits = await engine.inferFromExchange(
    userMessage,
    characterResponse,
    profile
  );

  return c.json({ inferredTraits });
});
```

## Expected Response Format

```typescript
interface InferredTrait {
  path: string;      // e.g., "personalityMap.dimensions.openness"
  value: unknown;    // e.g., 0.7 or "guarded"
  confidence: number; // 0-1
  source: string;    // Quote from conversation
}
```

## Acceptance Criteria

- [x] Empty array response removed
- [x] Trait inference prompt built from conversation
- [x] LLM called with system prompt for structured output
- [x] Response parsed as JSON array
- [x] Traits filtered by confidence threshold (>0.5)
- [x] Invalid JSON handled gracefully (returns empty array)
- [x] Trait objects match expected schema
