# TASK-006: Implement Heartbeat Monitor to Pause Stale Sessions

**Priority**: P0
**Status**: ✅ Ready for Review
**Estimate**: 1-2h
**Depends On**: TASK-005
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Add a server-side monitor that periodically checks for sessions without recent heartbeats and pauses them by stopping the tick scheduler.

This corresponds to the "Heartbeat Monitor" section in:

- [PLAN-session-presence-and-idle-timeout.md](../PLAN-session-presence-and-idle-timeout.md)

## Scope

- Create a monitor in `packages/workers` that:
  - Runs on a fixed interval (e.g. every 30 seconds)
  - Iterates tracked sessions from the presence service
  - Stops world ticks for sessions older than `PAUSE_THRESHOLD_MS`
  - Removes them from the in-memory presence map (so next heartbeat re-adds them)

Non-goals:

- DB persistence
- UI changes

## Files to Modify

- `packages/workers/src/` (new module)
  - `heartbeat-monitor.ts` (new)
- Worker startup/wiring (may be in a later task if you want to isolate concerns)

## Step-by-Step Instructions

1. Create `HeartbeatMonitor` class.
2. Constructor inputs should be explicit (no hidden globals):
   - presence service interface
   - scheduler interface
   - timing constants (or import from a shared config module)
3. Implement `start()` and `stop()`.
4. Implement a `checkOnce()` (or `check()`) method:
   - For each tracked session, compute `msSinceHeartbeat`
   - If `> PAUSE_THRESHOLD_MS`, call `scheduler.stopWorldTick(sessionId)`
   - Remove session from presence tracking
5. Add conservative logging with a stable prefix (e.g. `[Presence]` or `[HeartbeatMonitor]`).

## Testing

- Add unit tests for the monitor using a fake presence service and fake scheduler.
- Tests should be deterministic (no real timers). Prefer calling `checkOnce()`.

```bash
CI=true pnpm -C packages/workers test
CI=true pnpm -C packages/workers typecheck
CI=true pnpm -w turbo run typecheck
```

## Acceptance Criteria

- [ ] `HeartbeatMonitor` exists and can run checks on an interval
- [ ] Stale sessions trigger `scheduler.stopWorldTick(sessionId)`
- [ ] Stale sessions are removed from in-memory presence tracking
- [ ] Unit tests cover pause behavior deterministically
- [ ] Workers package tests and typecheck pass
