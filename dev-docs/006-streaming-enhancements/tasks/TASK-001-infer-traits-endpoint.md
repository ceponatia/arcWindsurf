# TASK-001: Create `/studio/infer-traits` Endpoint

**Priority**: P1
**Status**: 🔲 TODO
**Estimate**: 2h
**Plan**: PLAN-1.0

---

## Description

Create a new API endpoint that performs trait inference on a user-character exchange without blocking the response flow.

## Acceptance Criteria

- [ ] `POST /studio/infer-traits` endpoint exists
- [ ] Accepts `{ sessionId, userMessage, characterResponse, profile }`
- [ ] Returns `{ ok: true, inferredTraits: InferredTrait[] }`
- [ ] Uses existing `TraitInferenceEngine.inferFromExchange()`
- [ ] Persists inferred traits to session (updates `studio_sessions.inferredTraits`)
- [ ] Handles errors gracefully (returns empty array, logs error)

## Technical Notes

```typescript
// Request schema
interface InferTraitsRequest {
  sessionId: string;
  userMessage: string;
  characterResponse: string;
  profile: Partial<CharacterProfile>;
}

// Response
interface InferTraitsResponse {
  ok: boolean;
  inferredTraits: InferredTrait[];
}
```

## Files to Modify

- `packages/api/src/routes/studio.ts` - Add endpoint
- `packages/web/src/features/character-studio/services/llm.ts` - Add client function

## Dependencies

None - uses existing `TraitInferenceEngine`

## Notes

- Fixed several pre-existing type errors in `packages/api/src/routes/studio.ts` and `packages/web` that were preventing a clean typecheck.
- Updated `StudioLlmProvider` to be a full `LLMProvider` to satisfy `TraitInferenceEngine` and `StudioNpcActor` requirements.
- Added `id` generation to `inferTraitsFromKeywords` in the frontend to satisfy the `InferredTrait` interface.
