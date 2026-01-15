# TASK-002: Add Async Inference Call After Streaming

**Priority**: P1
**Status**: 🔲 TODO
**Estimate**: 1h
**Plan**: PLAN-1.0
**Depends On**: TASK-001

---

## Description

After the streaming `done` SSE event fires, make a non-blocking call to `/studio/infer-traits` and update the `pendingTraits` signal when results arrive.

## Acceptance Criteria

- [ ] After `done` event, call `inferTraits()` service function
- [ ] Call is fire-and-forget (doesn't block UI)
- [ ] On success, merge returned traits into `pendingTraits` signal
- [ ] On error, log to console (no user-facing error)
- [ ] Respects trait inference toggle (TASK-003)

## Technical Notes

```typescript
// In useConversation.ts sendMessage()
onDone: async (data) => {
  // ... existing done handling ...

  // Fire async trait inference (non-blocking)
  if (traitInferenceEnabled.value) {
    inferTraits({
      sessionId: studioSessionId.value,
      userMessage: content,
      characterResponse: fullResponse,
      profile: characterProfile.value,
    }).then((result) => {
      if (result.inferredTraits.length > 0) {
        pendingTraits.value = [
          ...pendingTraits.value,
          ...result.inferredTraits.map((t, i) => ({
            ...t,
            id: `trait-${Date.now()}-${i}`,
            status: 'pending' as const,
          })),
        ];
      }
    }).catch(console.error);
  }
}
```

## Files to Modify

- `packages/web/src/features/character-studio/hooks/useConversation.ts`
- `packages/web/src/features/character-studio/services/llm.ts` - Add `inferTraits()` function

## Dependencies

- TASK-001 (endpoint must exist)

## Notes

- Added `traitInferenceEnabled` signal to [packages/web/src/features/character-studio/signals.ts](packages/web/src/features/character-studio/signals.ts) (defaults to `true`).
- Updated `useConversation.ts` to perform non-blocking trait inference after streaming is complete.
- Inferred traits from the async call are merged into `pendingTraits` with a unique `trait-async-` ID prefix.
