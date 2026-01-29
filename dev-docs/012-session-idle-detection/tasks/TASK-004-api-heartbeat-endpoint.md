# TASK-004: Add Heartbeat API Endpoint

**Priority**: P0
**Status**: ✅ Ready for Review
**Estimate**: 45-90 minutes
**Depends On**: TASK-003
**Plan**: PLAN-session-presence-and-idle-timeout

---

## Objective

Add a backend API endpoint for the web client heartbeat:

- `POST /api/sessions/:sessionId/heartbeat`

This enables the backend to record presence and later drive pause/resume behavior.

## Scope

- Implement a minimal endpoint that:
  - Accepts `sessionId` as a path param
  - Calls a presence service method to record the heartbeat
  - Returns a small JSON response including status and timestamps

Non-goals:

- Worker monitor logic (later tasks)
- DB persistence (optional, later task)

## Files to Modify

- API routes (create a new route module if that matches the codebase patterns)
- API route registration (router composition)

## Step-by-Step Instructions

1. Add an endpoint handler for `POST /sessions/:sessionId/heartbeat`.
2. Validate `sessionId`:
   - Must be present
   - Must be a non-empty string
3. Call a presence service function (placeholder allowed initially) to record a heartbeat.
4. Return JSON:

```json
{ "ok": true, "sessionId": "...", "status": "running|resumed", "lastHeartbeat": "ISO" }
```

5. Ensure the endpoint is reachable under the same base path the web client uses (`/api/...`).

## Testing

Manual:

```bash
CI=true curl -X POST http://localhost:8787/api/sessions/test-session/heartbeat
```

Typecheck:

```bash
CI=true pnpm -C packages/api typecheck
CI=true pnpm -w turbo run typecheck
```

## Acceptance Criteria

- [ ] `POST /api/sessions/:sessionId/heartbeat` returns `200` with `{ ok: true }`
- [ ] Response includes `sessionId`, `status`, and `lastHeartbeat` (ISO string)
- [ ] Invalid/missing sessionId returns a `4xx`
- [ ] API package typecheck passes
