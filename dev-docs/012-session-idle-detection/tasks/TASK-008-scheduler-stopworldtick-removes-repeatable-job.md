# TASK-008: Verify stopWorldTick Fully Cancels Repeatable Tick Jobs

**Priority**: P1
**Status**: ✅ Ready for Review
**Estimate**: 45-90 minutes
**Depends On**: TASK-007
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Ensure pausing a session actually stops compute by removing (or disabling) the BullMQ repeatable tick job for that session.

This corresponds to "Scheduler Integration" from:

- [PLAN-session-presence-and-idle-timeout.md](../PLAN-session-presence-and-idle-timeout.md)

## Scope

- Audit the scheduler implementation for `startWorldTick(sessionId)` and `stopWorldTick(sessionId)`.
- Ensure `stopWorldTick` is idempotent.
- Ensure repeatable jobs are removed and do not re-schedule.

## Files to Modify

- `packages/workers/src/scheduler/index.ts` (or equivalent)

## Step-by-Step Instructions

1. Identify how repeatable jobs are keyed per session.
2. Confirm `stopWorldTick(sessionId)` removes the repeatable job in BullMQ (not only "stopping processing").
3. Ensure `startWorldTick(sessionId)` does not create duplicates for the same session.
4. Add a deterministic test using BullMQ test patterns already in the repo (or a small integration harness) that:
   - starts ticks
   - stops ticks
   - asserts the repeatable job no longer exists

## Testing

```bash
CI=true pnpm -C packages/workers test
CI=true pnpm -C packages/workers typecheck
```

## Acceptance Criteria

- [ ] `stopWorldTick(sessionId)` removes the repeatable job for that session
- [ ] Calling `stopWorldTick(sessionId)` multiple times is safe (idempotent)
- [ ] Calling `startWorldTick(sessionId)` multiple times does not create duplicate repeatable jobs
- [ ] A test (or documented, repeatable verification procedure) demonstrates correct behavior
