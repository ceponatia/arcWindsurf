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

1. Import `TRAIT_INFERENCE_SYSTEM_PROMPT` and `buildTraitInferencePrompt` from `./studio/prompts.js`
2. Build inference prompt from conversation data
3. Call LLM with structured output expectation
4. Parse JSON response from LLM
5. Validate and filter traits by confidence threshold
6. Return parsed traits array

## Code Structure

```typescript
import {
  TRAIT_INFERENCE_SYSTEM_PROMPT,
  buildTraitInferencePrompt
} from './studio/prompts.js';

app.post('/studio/infer-traits', async (c) => {
  // ... validation ...

  const inferencePrompt = buildTraitInferencePrompt(
    userMessage,
    characterResponse,
    currentProfile
  );

  const messages = [
    { role: 'system', content: TRAIT_INFERENCE_SYSTEM_PROMPT },
    { role: 'user', content: inferencePrompt },
  ];

  const result = await Effect.runPromise(llmProvider.chat(messages));
  const traits = parseTraitInferenceResponse(result.content);

  return c.json({ traits });
});

function parseTraitInferenceResponse(content: string | null): InferredTrait[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed)
      ? parsed.filter(t => t.confidence > 0.5)
      : [];
  } catch {
    return [];
  }
}
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
