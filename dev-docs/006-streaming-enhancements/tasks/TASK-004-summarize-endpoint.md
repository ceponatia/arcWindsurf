# TASK-004: Create `/studio/summarize` Endpoint

**Priority**: P2
**Status**: 🔲 TODO
**Estimate**: 2h
**Plan**: PLAN-1.0

---

## Description

Create an API endpoint that summarizes older messages in a conversation, using a rolling window strategy to preserve recent context.

## Acceptance Criteria

- [ ] `POST /studio/summarize` endpoint exists
- [ ] Accepts `{ sessionId }`
- [ ] Summarizes oldest N messages (configurable, default 10)
- [ ] Keeps most recent 10 messages in full detail
- [ ] Returns `{ ok: true, summary: string, messagesRemoved: number }`
- [ ] Updates `studio_sessions.summary` in database
- [ ] Updates `studio_sessions.conversation` (removes summarized messages)
- [ ] Stores original messages somewhere for audit (optional)

## Technical Notes

### Rolling Window Strategy

```text
Before: [msg1, msg2, ... msg20]
After:  [summary of msg1-10] + [msg11, msg12, ... msg20]
```

### Implementation

```typescript
// Use existing ConversationManager.summarize() or similar
const manager = new ConversationManager({ llmProvider, characterName });
manager.restore({ messages: session.conversation, summary: session.summary });

// Summarize if needed
await manager.summarize();

// Get new state
const newSummary = manager.getSummary();
const recentMessages = manager.getContextWindow();
```

## Files to Modify

- `packages/api/src/routes/studio.ts` - Add endpoint
- `packages/web/src/features/character-studio/services/llm.ts` - Add client function (optional)

## Dependencies

- Uses existing `ConversationManager` summarization logic
