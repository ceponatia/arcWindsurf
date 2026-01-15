# PLAN-1.0: Streaming Enhancements

**Priority**: P1 - High
**Status**: Completed
**Created**: January 14, 2026

---

## Executive Summary

Wave 005 and INV-001 identified that the streaming implementation bypasses several XState actor features (trait inference, conversation summarization) to achieve a 4x performance improvement (31s → 7.5s). This wave adds back those features in a non-blocking way while preserving the streaming performance gains.

### Background

The non-streaming XState flow made 2-3 sequential LLM calls:

1. `generateResponse` (~7s) - Main character response
2. `inferTraits` (~7s) - Trait inference via `TraitInferenceEngine`
3. `summarize` (~7s, if triggered) - Conversation summarization

Streaming bypasses #2 and #3 entirely, calling `llmProvider.stream()` directly.

---

## Goals

1. **Async trait inference** - Run trait inference after streaming completes without blocking UI
2. **UI toggle for inference** - Allow users to enable/disable automatic trait inference
3. **Background summarization** - Trigger summarization at 20-message threshold without blocking

---

## Feature 1: Async Trait Inference

### Description

After a streaming response completes, fire off a background trait inference request. The UI updates when results arrive, but the user doesn't wait for it.

### Design

```text
User sends message
  ↓
Stream response to UI (7s)
  ↓
[done] event fires
  ↓
Fire async POST /studio/infer-traits (non-blocking)
  ↓
When response arrives, update pendingTraits signal
```

### Implementation Notes

- New endpoint: `POST /studio/infer-traits`
- Accepts: `{ sessionId, userMessage, characterResponse, profile }`
- Returns: `{ inferredTraits: InferredTrait[] }`
- Frontend calls this after `done` SSE event, updates `pendingTraits` signal on completion
- Errors are logged but don't affect user flow

### UI Toggle

- Add toggle near chat input: "Auto-detect personality traits"
- Default: ON
- Stored in `localStorage` or user preferences
- When OFF, skip the async inference call

---

## Feature 2: Background Summarization

### Description

When conversation reaches 20 messages, trigger a background summarization job. Use a rolling window to preserve recent context during processing.

### Design

```text
Conversation reaches 20 messages
  ↓
Trigger POST /studio/summarize (non-blocking)
  ↓
Server summarizes oldest 10 messages
  ↓
Summary prepended to conversation context
  ↓
Original 10 messages removed from context window (kept in DB for audit)
```

### Rolling Window Strategy

- **Threshold**: 20 messages (configurable)
- **Summarize**: Oldest 10 messages
- **Keep**: Most recent 10 messages in full detail
- **Result**: Summary (~200 words) + 10 recent messages
- **Cap**: Summary doesn't count toward 20-message limit

### Implementation Notes

- New endpoint: `POST /studio/summarize`
- Accepts: `{ sessionId }`
- Returns: `{ summary: string, messagesRemoved: number }`
- Can be triggered automatically or manually via UI button
- Summary stored in `studio_sessions.summary` field (already exists)

---

## Feature 3: Streaming Dilemma (Future)

### Description

Currently dilemmas use the simplified flow (generate scenario → send as message → stream response). If we want the full dilemma analysis, we could add streaming for that too.

### Priority

Low - Current implementation works well. Defer unless users request deeper dilemma analysis.

---

## Tasks (To Be Created)

| ID | Title | Priority | Estimate |
|----|-------|----------|----------|
| TASK-001 | Create `/studio/infer-traits` endpoint | P1 | 2h |
| TASK-002 | Add async inference call after streaming done | P1 | 1h |
| TASK-003 | Add UI toggle for trait inference | P2 | 1h |
| TASK-004 | Create `/studio/summarize` endpoint | P2 | 2h |
| TASK-005 | Add automatic summarization trigger at 20 messages | P2 | 1h |
| TASK-006 | Add manual "Summarize" button to UI | P3 | 30m |

---

## Success Criteria

1. Trait inference runs after streaming without blocking UI
2. Users can toggle trait inference on/off
3. Long conversations (20+ messages) trigger automatic summarization
4. No regression in streaming response time (~7s)

---

## Dependencies

- INV-001 investigation (completed)
- Streaming endpoint (completed)
- Dilemma refactor (completed)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Async inference adds perceived complexity | Toggle defaults ON, works invisibly |
| Summarization loses important context | Keep 10 recent messages, store originals in DB |
| Background jobs fail silently | Add logging, optional toast notifications |

---

## Decisions

1. **Trait inference toggle persistence**: Per-session via `localStorage`. Global toggle deferred to user accounts feature.
2. **Async inference indicator**: Show subtle indicator in dev mode only (tied to existing dev flag in Docker config).
3. **Manual summarize button**: Add to chat UI, visible in dev mode only.
