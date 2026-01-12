# TASK-009: Register Event Persistence Handler in API

**Priority**: P2
**Estimate**: 1-2 hours
**Category**: World Bus Event Sourcing

---

## Objective

Wire the persistence middleware handler to actually save events to the database, completing the event sourcing pipeline.

## Files to Modify

- `packages/api/src/server-impl.ts` (or appropriate startup location)

## Current State

`packages/bus/src/middleware/persistence.ts`:

```typescript
// Lines 3-9:
// We'll need a way to access the DB. Since @minimal-rpg/bus shouldn't
// depend on @minimal-rpg/db directly (it's level 1, db is level 1),
// we might need to inject the persistence handler or use a global.

let persistenceHandler: PersistenceHandler | null = null;

export function registerPersistenceHandler(handler: PersistenceHandler) {
  persistenceHandler = handler;
}
```

The handler injection exists but is never called.

## Implementation Steps

### 1. Create Event Persistence Service

`packages/api/src/services/event-persistence.ts`:

```typescript
import { saveEvent } from '@minimal-rpg/db';
import type { WorldEvent } from '@minimal-rpg/schemas';

let currentSequence = new Map<string, bigint>(); // sessionId -> sequence

export async function persistWorldEvent(event: WorldEvent): Promise<void> {
  const rawEvent = event as Record<string, unknown>;
  const sessionId = rawEvent['sessionId'] as string | undefined;

  if (!sessionId) {
    // System events without session - may skip or use global sequence
    return;
  }

  // Get and increment sequence for session
  const seq = currentSequence.get(sessionId) ?? 0n;
  currentSequence.set(sessionId, seq + 1n);

  await saveEvent({
    sessionId,
    sequence: seq,
    type: event.type,
    payload: rawEvent['payload'] as Record<string, unknown> ?? rawEvent,
    actorId: rawEvent['actorId'] as string | null,
    causedByEventId: rawEvent['causedByEventId'] as string | null,
  });
}
```

### 2. Register Handler at Startup

In `packages/api/src/server-impl.ts`:

```typescript
import { worldBus, registerPersistenceHandler, persistenceMiddleware } from '@minimal-rpg/bus';
import { persistWorldEvent } from './services/event-persistence.js';

// During server initialization
function initializeWorldBus() {
  // Register persistence handler
  registerPersistenceHandler(persistWorldEvent);

  // Add middleware to bus
  worldBus.use(persistenceMiddleware);

  console.log('WorldBus persistence initialized');
}
```

### 3. Handle Sequence Recovery

On session load, recover sequence from database:

```typescript
import { getEventsForSession } from '@minimal-rpg/db';

export async function recoverSessionSequence(sessionId: string): Promise<void> {
  const events = await getEventsForSession(sessionId);
  if (events.length > 0) {
    const maxSeq = events[events.length - 1].sequence;
    currentSequence.set(sessionId, maxSeq + 1n);
  }
}
```

## Acceptance Criteria

- [ ] Event persistence service created
- [ ] Handler registered at API startup
- [ ] WorldBus uses persistence middleware
- [ ] Events saved to `events` table on emit
- [ ] Sequence numbers incrementing correctly per session
- [ ] Session sequence recovered on load
- [ ] System events (no session) handled gracefully
- [ ] Database errors logged but don't block bus

## Notes

- Consider async queue for high-throughput scenarios
- May want configurable persistence (enable/disable)
- Events table should have proper indexes (verified in schema)
