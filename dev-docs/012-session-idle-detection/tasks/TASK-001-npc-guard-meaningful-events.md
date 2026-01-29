# TASK-001: Guard NPC Cognition Behind Meaningful Events

**Priority**: P0
**Status**: ✅ Ready for Review
**Estimate**: 45-90 minutes
**Depends On**: None
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Stop continuous LLM inference caused by NPCs reacting to every `WORLD_EVENT` (including `TICK`). NPC cognition should only run for a narrow set of meaningful, player-relevant events.

This task addresses the core issue described in:

- [AUDIT-inference-triggers.md](../AUDIT-inference-triggers.md)
- [ANALYSIS-npc-awareness-and-context.md](../ANALYSIS-npc-awareness-and-context.md)

## Scope

- Add a guard in the NPC state machine so `WORLD_EVENT` only transitions into cognition for meaningful event types.
- Default to a very small allowlist (start conservative).
- Ensure `TICK` does not trigger cognition.

Non-goals:

- Heartbeat/presence detection (covered in later tasks)
- Chat history/memory integration (explicitly out-of-scope for this phase)

## Implementation Notes

Recommended initial allowlist:

- `SPOKE` (player speech)

Optional (only if already emitted and proven safe):

- `ARRIVED`, `DEPARTED`, `TIME_OF_DAY_CHANGED`, `SCHEDULE_TRIGGERED`, `PROXIMITY_ALERT`

If those events do not exist yet, do not add them in this task. Keep the allowlist to `SPOKE` only.

## Files to Modify

- `packages/actors/src/npc/npc-machine.ts`

## Step-by-Step Instructions

1. Locate the `WORLD_EVENT` transition in the NPC machine where any event currently triggers the `perceiving` state.
2. Add a guard (e.g. `isMeaningfulEvent`) to that transition.
3. Implement the guard as an allowlist of `event.data.type` (or equivalent structure in the machine event payload).
4. Ensure `TICK` is not included in the allowlist.
5. Add a small, explicit unit test for the guard behavior if there are existing actor tests nearby; otherwise add a minimal test in the same package that asserts the machine does not transition on `TICK`.

## Testing

Run actor unit tests (package-local) and then a workspace typecheck.

```bash
CI=true pnpm -C packages/actors test
CI=true pnpm -C packages/actors typecheck
CI=true pnpm -w turbo run typecheck
```

## Acceptance Criteria

- [ ] NPC machine no longer transitions into cognition for `TICK` events
- [ ] NPC machine only reacts to a small allowlist of event types (start with `SPOKE`)
- [ ] A unit test (or equivalent deterministic check) proves `TICK` does not cause cognition transition
- [ ] Actor package tests pass
- [ ] Workspace typecheck succeeds
