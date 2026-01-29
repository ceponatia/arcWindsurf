# TASK-007: Wire Presence + Scheduler + Heartbeat Monitor in Workers

**Priority**: P0
**Status**: ✅ Ready for Review
**Estimate**: 1-2h
**Depends On**: TASK-006
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Ensure the heartbeat monitor actually runs in the worker process and is connected to the real scheduler implementation.

## Scope

- Instantiate the presence service and provide it access to the scheduler (for resume).
- Instantiate and start the heartbeat monitor on worker startup.

Non-goals:

- DB persistence
- Fine-grained per-page presence signals (the heartbeat is intentionally chat-only)

## Files to Modify

- Worker entrypoint / initialization file(s) in `packages/workers/src/` (where scheduler and queues are wired)
- Any shared wiring modules needed to pass scheduler to the presence service

## Step-by-Step Instructions

1. Identify the worker startup path where the scheduler is created.
2. Ensure there is a single scheduler instance used for:
   - the tick scheduling
   - `stopWorldTick(sessionId)`
   - `startWorldTick(sessionId)`
3. Create one presence service instance and register the scheduler with it (direct injection).
4. Create one heartbeat monitor instance and start it.
5. Ensure worker shutdown stops the monitor if there is an existing shutdown hook.

## Testing

- Run workers package tests.
- Perform a manual check:
  1. Start the stack.
  2. Open session chat and confirm ticks start.
  3. Close the tab.
  4. Wait > `PAUSE_THRESHOLD_MS`.
  5. Confirm ticks stop.
  6. Re-open chat and confirm ticks resume.

```bash
CI=true pnpm -C packages/workers test
CI=true pnpm -w turbo run typecheck
```

## Acceptance Criteria

- [ ] Worker process starts the heartbeat monitor
- [ ] Presence service can resume ticks via injected scheduler
- [ ] Stale sessions are paused automatically by monitor
- [ ] Manual pause/resume flow works end-to-end
- [ ] Workers tests and workspace typecheck pass
