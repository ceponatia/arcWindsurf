# TASK-002: Remove MOVED-Driven Speech Trigger From NPC Cognition

**Priority**: P0
**Status**: ✅ Ready for Review
**Estimate**: 30-60 minutes
**Depends On**: TASK-001
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Eliminate the rule that generates speech intents (and thus LLM inference) in response to `MOVED` events.

This is explicitly called out as problematic in:

- [AUDIT-inference-triggers.md](../AUDIT-inference-triggers.md)
- [ANALYSIS-npc-awareness-and-context.md](../ANALYSIS-npc-awareness-and-context.md)

## Scope

- Remove the special-case cognition behavior that treats movement events as a reason to talk.
- Preserve movement as state updates only.

Non-goals:

- Replacing it with a new greeting system (that should be driven by explicit, meaningful events like `ARRIVED` emitted by a service, not raw `MOVED`).

## Files to Modify

- `packages/actors/src/npc/cognition.ts`

## Step-by-Step Instructions

1. Find the logic that filters recent events for `MOVED` and generates a `SPEAK_INTENT` (or equivalent output) based on movement.
2. Remove that logic entirely.
3. Ensure the cognition decision path still responds to player-driven speech (`SPOKE`) normally.
4. Add or adjust a unit test (if present) to assert that a `MOVED` event alone does not produce a speak intent.

## Testing

```bash
CI=true pnpm -C packages/actors test
CI=true pnpm -C packages/actors typecheck
```

## Acceptance Criteria

- [ ] `MOVED` events no longer cause any LLM-triggering output (e.g. `SPEAK_INTENT`)
- [ ] Player `SPOKE` events still produce normal NPC response behavior
- [ ] A deterministic test covers the "MOVED does not speak" behavior (preferred)
- [ ] Actor package tests pass
