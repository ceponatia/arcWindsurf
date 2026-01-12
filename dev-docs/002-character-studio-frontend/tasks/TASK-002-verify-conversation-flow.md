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

- [ ] Message input accepts text
- [ ] Send triggers API call to `/studio/generate`
- [ ] Response streams and displays progressively
- [ ] Trait inference triggers after response
- [ ] Trait suggestions display in UI (if any)
- [ ] Accept/Dismiss buttons function
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

## Acceptance Criteria

- [ ] Conversation generates LLM responses
- [ ] Trait suggestions appear based on conversation content
- [ ] Accept/dismiss UI works (even if traits don't apply yet)
