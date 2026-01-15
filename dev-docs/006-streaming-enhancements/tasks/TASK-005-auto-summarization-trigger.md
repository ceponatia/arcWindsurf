# TASK-005: Add Automatic Summarization Trigger

**Priority**: P2
**Status**: 🔲 TODO
**Estimate**: 1h
**Plan**: PLAN-1.0
**Depends On**: TASK-004

---

## Description

Automatically trigger background summarization when conversation reaches 20 messages.

## Acceptance Criteria

- [ ] After streaming `done` event, check message count
- [ ] If count >= 20, fire async `POST /studio/summarize`
- [ ] Call is non-blocking (fire-and-forget)
- [ ] On success, update local conversation state with summary
- [ ] On error, log but don't block user
- [ ] Don't re-trigger if summary already exists (avoid loops)

## Technical Notes

```typescript
// In useConversation.ts, after done event
onDone: async (data) => {
  // ... existing handling ...

  // Check if summarization needed
  const messageCount = conversationHistory.value.length;
  if (messageCount >= 20 && !hasSummary.value) {
    summarizeConversation({ sessionId: studioSessionId.value })
      .then((result) => {
        if (result.ok) {
          // Could optionally refresh conversation from server
          // Or add summary to local state
          console.log(`Summarized ${result.messagesRemoved} messages`);
        }
      })
      .catch(console.error);
  }
}
```

### Threshold Configuration

Consider making threshold configurable via environment variable:

```text
STUDIO_SUMMARIZATION_THRESHOLD=20
```

## Files to Modify

- `packages/web/src/features/character-studio/hooks/useConversation.ts`
- `packages/web/src/features/character-studio/services/llm.ts` - Add `summarizeConversation()` function

## Dependencies

- TASK-004 (endpoint must exist)
