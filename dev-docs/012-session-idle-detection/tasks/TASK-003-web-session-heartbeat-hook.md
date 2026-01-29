# TASK-003: Add Session Heartbeat Hook in Chat Panel

**Priority**: P0
**Status**: ✅ Ready for Review
**Estimate**: 45-90 minutes
**Depends On**: None
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Implement a client-side heartbeat that runs only while the session chat panel is mounted. This is the signal that the player is actively observing the session.

This is the "Client-Side Heartbeat (ChatPanel only)" section from:

- [PLAN-session-presence-and-idle-timeout.md](../PLAN-session-presence-and-idle-timeout.md)

## Scope

- Create a hook that POSTs to `/api/sessions/:sessionId/heartbeat`.
- Integrate the hook inside the chat UI for sessions (not globally).

Non-goals:

- Any server-side presence logic (later tasks)
- Heartbeat on other pages (explicitly not desired)

## Files to Modify

- `packages/web/src/hooks/useSessionHeartbeat.ts` (new)
- The session chat panel component (where the sessionId is available)

## Step-by-Step Instructions

1. Create `useSessionHeartbeat(sessionId)` hook.
2. In the hook:
   - If `sessionId` is null/undefined, do nothing.
   - Send one heartbeat immediately on mount.
   - Send additional heartbeats on an interval (default target: 60 seconds).
   - On unmount, stop the interval.
   - Log failures with a console warning (do not throw).
3. Call `useSessionHeartbeat(sessionId)` from the chat panel component that renders the active session chat.
4. Confirm navigating away from the chat panel stops heartbeats.

## Testing

Manual:

1. Open a session chat.
2. Confirm a POST request is made to the heartbeat endpoint.
3. Navigate away from the session chat.
4. Confirm no more heartbeat requests are made.

Typecheck:

```bash
CI=true pnpm -C packages/web typecheck
CI=true pnpm -w turbo run typecheck
```

## Acceptance Criteria

- [ ] `useSessionHeartbeat` exists and is used inside the session chat panel
- [ ] Heartbeat fires immediately on mount and then at a fixed interval
- [ ] Heartbeat stops when the chat panel unmounts (navigating away)
- [ ] Heartbeat failures do not crash the UI
- [ ] Web package typecheck passes
