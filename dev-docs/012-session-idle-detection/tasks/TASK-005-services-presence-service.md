# TASK-005: Implement Presence Service (Record Heartbeat + Resume)

**Priority**: P0
**Status**: ✅ Ready for Review
**Estimate**: 1-2h
**Depends On**: TASK-004
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Create a backend presence service that records session heartbeats and can resume a paused session when a heartbeat arrives.

This corresponds to the "Presence Service" section in:

- [PLAN-session-presence-and-idle-timeout.md](../PLAN-session-presence-and-idle-timeout.md)

## Scope

- Implement a presence service that:
  - Tracks `lastHeartbeatAt` per session (in-memory for now)
  - Exposes `recordHeartbeat(sessionId)`
  - Can call `scheduler.startWorldTick(sessionId)` when a session transitions from inactive to active

Non-goals:

- Stopping ticks for stale sessions (worker monitor task)
- Persisting heartbeats to DB (optional task)

## Files to Modify

- `packages/services/src/presence/` (new folder)
  - `presence-service.ts` (new)
  - `types.ts` (new, if helpful)
- API endpoint integration (wire endpoint to call this service)

## Step-by-Step Instructions

1. Create a presence module under `packages/services/src/presence/`.
2. Define constants:
   - `HEARTBEAT_INTERVAL_MS` (client contract, informational)
   - `PAUSE_THRESHOLD_MS` (e.g. 5 minutes)
3. Implement `recordHeartbeat(sessionId)`:
   - Update an in-memory map of `{ sessionId, lastHeartbeatAt }`
   - Detect whether the session was previously inactive (no record or older than threshold)
   - If inactive and a scheduler is available, call `startWorldTick(sessionId)` and return status `resumed`
   - Otherwise return status `running`
4. Expose read APIs needed by the monitor:
   - `getLastHeartbeat(sessionId)`
   - `listSessions()` / `getSessions()`
5. Update the heartbeat API endpoint to call this service and return its status.

## Testing

- Add unit tests for `recordHeartbeat`:
  - First heartbeat returns `resumed` or `running` depending on chosen semantics
  - Heartbeat after long gap returns `resumed` and triggers scheduler start
  - Heartbeat within threshold does not restart scheduler

```bash
CI=true pnpm -C packages/services test
CI=true pnpm -C packages/services typecheck
CI=true pnpm -w turbo run typecheck
```

## Acceptance Criteria

- [ ] Presence service exists under `packages/services/src/presence/` and is exported consistently
- [ ] `recordHeartbeat(sessionId)` updates `lastHeartbeatAt` and returns `status` + timestamp
- [ ] If heartbeat arrives after inactivity, service resumes ticks via `scheduler.startWorldTick(sessionId)`
- [ ] Service exposes a session enumeration method for the monitor to inspect
- [ ] Unit tests cover inactivity/resume behavior deterministically (no timers required)
- [ ] Services package tests and typecheck pass
