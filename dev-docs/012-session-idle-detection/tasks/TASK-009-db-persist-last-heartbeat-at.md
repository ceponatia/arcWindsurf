# TASK-009: Persist lastHeartbeatAt to Database (Optional Hardening)

**Priority**: P2
**Status**: ✅ Ready for Review
**Estimate**: 2-4h
**Depends On**: TASK-007
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Persist session heartbeats so the system can survive restarts and support future multi-worker deployments.

This corresponds to "Database Persistence (Optional)" from:

- [PLAN-session-presence-and-idle-timeout.md](../PLAN-session-presence-and-idle-timeout.md)

## Scope

- Add a `lastHeartbeatAt` field/column for sessions.
- Update heartbeat handling to write to the database.
- On startup, ensure stale sessions do not auto-start ticks.

## Files to Modify

- `packages/db` schema + migration
- Any session read/write layers used by the API/services

## Step-by-Step Instructions

1. Add a `last_heartbeat_at TIMESTAMPTZ` column to the sessions table.
2. Update the heartbeat endpoint/service to write `lastHeartbeatAt = now()`.
3. On worker startup:
   - Query sessions whose `lastHeartbeatAt` is null or older than `PAUSE_THRESHOLD_MS`.
   - Ensure ticks are NOT started for those sessions.
4. Ensure the in-memory presence map is seeded conservatively (optional): only seed sessions that are recently active.

## Testing

- Add DB-layer tests if the repo already has migration tests.
- Manually validate:
  1. Start a session and generate a heartbeat.
  2. Confirm the DB field updates.
  3. Restart the server.
  4. Confirm stale sessions do not resume ticking without a heartbeat.

Typecheck:

```bash
CI=true pnpm -w turbo run typecheck
```

## Acceptance Criteria

- [ ] Database has `last_heartbeat_at` column for sessions
- [ ] Heartbeat updates the persisted timestamp
- [ ] After restart, sessions without recent heartbeats do not auto-start ticks
- [ ] Workspace typecheck passes
