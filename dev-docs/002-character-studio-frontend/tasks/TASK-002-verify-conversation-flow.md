# TASK-002: Verify Conversation Flow

**Priority**: P0
**Estimate**: 1 hour
**Phase**: 0 - Verification
**Depends On**: TASK-001

---

## Objective

Verify that the conversation panel works with the LLM backend and trait inference functions correctly.

## Prerequisites

- API server running
- LLM API key configured (OPENROUTER_API_KEY or equivalent)
- At least one character created (from TASK-001)

## Steps

1. Open a character in Character Studio
2. Type a message in the conversation panel
3. Verify LLM response streams back
4. Check that trait suggestions appear (if conversation reveals traits)
5. Test accept/dismiss trait buttons

## What to Check

- [x] Message input accepts text
- [x] Send triggers API call to `/studio/generate`
- [x] Response streams and displays progressively (Note: currently renders once complete)
- [x] Trait inference triggers after response
- [x] Trait suggestions display in UI (if any)
- [x] Accept/Dismiss buttons function
- [ ] Error states display gracefully (if API fails)

## Environment Variables to Verify

```text
OPENROUTER_API_KEY=<your-key>
OPENROUTER_MODEL=deepseek/deepseek-chat (or similar)
```

## If Issues Found

Document in `TASK-002a-fix-<issue>.md`

Common issues:

- Streaming not rendering incrementally
- Trait inference returning empty (check prompt)
- CORS or network errors

Status: Backend SSE works; UI still renders full responses only (see TASK-002a-fix-conversation-streaming). Trait inference returns suggestions when content includes fears (tested via `scripts/test-streaming.mjs`).

## Acceptance Criteria

- [x] Conversation generates LLM responses
- [x] Trait suggestions appear based on conversation content
- [x] Accept/dismiss UI works (even if traits don't apply yet)

---

## Verification Log (2026-01-12)

Verified conversation and trait inference flow:
1. **Conversation**: Sent "What's your biggest fear?". Character responded with a detailed fear of "losing the ability to create".
2. **Latency**: `studio/generate` took ~2 seconds. `studio/infer-traits` took ~15 seconds to return suggestions.
3. **Trait Suggestions**: Successfully rendered suggestions for "Neuroticism", "Values", "Fears", "Boundaries", "Expressiveness", and "Stress Indicators".
4. **Interaction**:
    - Clicked **Accept** on "Fears": Successfully removed item from pending list.
    - Clicked **Reject** on "Neuroticism": Successfully removed item from pending list.
5. **UI Feedback**: The "is thinking..." indicator correctly persisted while `infer-traits` was running and disappeared once the suggestions were ready.

Note: As documented in the status, the response currently renders all at once rather than incrementally streaming, but the underlying SSE is functional.
