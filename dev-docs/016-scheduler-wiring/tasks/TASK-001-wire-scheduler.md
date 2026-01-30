# TASK-001: Wire Scheduler to Schedule Service

**Priority**: P0
**Status**: ✅ Complete
**Estimate**: 4-6 hours
**Depends On**: None (all infrastructure exists)
**Category**: Scheduler Wiring

---

## Objective

Connect `Scheduler.processSchedules()` to the schedule resolution logic and WorldBus to enable NPC autonomous movement.

## Current Code

```typescript
// packages/services/src/time/scheduler.ts
export class Scheduler {
  static async processSchedules(tick: number): Promise<void> {
    // TODO: Implement schedule processing - check NPC schedules against current tick,
    // emit location change events via worldBus when NPCs need to move
    console.debug(`[Scheduler] Processing schedules for tick ${tick}`);
    await Promise.resolve();
  }
}
```

## Target Implementation

```typescript
import { worldBus } from '@minimal-rpg/bus';
import {
  resolveNpcSchedulesBatch,
  type NpcScheduleData,
} from '@api/services/schedule-service';
import {
  getActiveSessions,
  getSessionNpcsWithSchedules,
  getSessionGameTime,
  getActorState,
  updateActorState,
} from '@minimal-rpg/db';
import type { GameTime, NpcLocationState } from '@minimal-rpg/schemas';

export class Scheduler {
  private static processing = new Set<string>(); // Prevent concurrent processing per session

  /**
   * Process schedules for all active sessions.
   */
  static async processAllSchedules(tick: number): Promise<void> {
    const sessions = await getActiveSessions();

    await Promise.all(
      sessions.map(session => this.processSchedules(session.id, tick))
    );
  }

  /**
   * Process schedules for a single session.
   */
  static async processSchedules(sessionId: string, tick: number): Promise<void> {
    // Prevent concurrent processing
    if (this.processing.has(sessionId)) {
      console.debug(`[Scheduler] Skipping ${sessionId} - already processing`);
      return;
    }

    this.processing.add(sessionId);

    try {
      // 1. Get current game time for session
      const gameTime = await getSessionGameTime(sessionId);
      if (!gameTime) {
        console.warn(`[Scheduler] No game time for session ${sessionId}`);
        return;
      }

      // 2. Get all NPCs with schedules
      const npcs = await getSessionNpcsWithSchedules(sessionId);
      if (npcs.length === 0) return;

      // 3. Resolve schedules for all NPCs
      const { locationStates, resolutions, unresolved } = resolveNpcSchedulesBatch(
        npcs,
        { currentTime: gameTime }
      );

      if (unresolved.length > 0) {
        console.debug(`[Scheduler] Unresolved NPCs: ${unresolved.join(', ')}`);
      }

      // 4. Process each NPC
      for (const [npcId, newState] of locationStates) {
        await this.processNpcSchedule(sessionId, npcId, newState, gameTime);
      }

    } finally {
      this.processing.delete(sessionId);
    }
  }

  /**
   * Process schedule for a single NPC.
   */
  private static async processNpcSchedule(
    sessionId: string,
    npcId: string,
    newState: NpcLocationState,
    gameTime: GameTime
  ): Promise<void> {
    // Get current state
    const currentState = await getActorState(sessionId, npcId);
    if (!currentState) return;

    const currentLocationId = currentState.locationId;
    const newLocationId = newState.locationId;

    // Check if NPC needs to move
    if (currentLocationId !== newLocationId) {
      // Emit MOVE_INTENT
      await worldBus.emit({
        type: 'MOVE_INTENT',
        actorId: npcId,
        fromLocationId: currentLocationId,
        toLocationId: newLocationId,
        reason: 'schedule',
        sessionId,
        timestamp: new Date(),
      });
    }

    // Update activity if changed (even if location didn't change)
    const currentActivity = currentState.activity?.type;
    const newActivity = newState.activity?.type;

    if (currentActivity !== newActivity) {
      await updateActorState(sessionId, npcId, {
        activity: newState.activity,
        interruptible: newState.interruptible,
        scheduleSlotId: newState.scheduleSlotId,
      });

      // Emit state change for ambient narration
      await worldBus.emit({
        type: 'NPC_ACTIVITY_CHANGED',
        actorId: npcId,
        previousActivity: currentActivity,
        newActivity: newActivity,
        sessionId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Subscribe to TICK events.
   */
  static start(): void {
    worldBus.subscribe(async (event) => {
      if (event.type === 'TICK') {
        await this.processAllSchedules(event.tick);
      }
    });
    console.log('[Scheduler] Started - listening for TICK events');
  }
}
```

## Required DB Functions

Add these to `@minimal-rpg/db` if not present:

```typescript
// Get all active sessions
export async function getActiveSessions(): Promise<{ id: string }[]> {
  return drizzle
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.status, 'active'));
}

// Get NPCs with schedules for a session
export async function getSessionNpcsWithSchedules(
  sessionId: string
): Promise<NpcScheduleData[]> {
  const actors = await drizzle
    .select()
    .from(actorStates)
    .where(and(
      eq(actorStates.sessionId, sessionId),
      eq(actorStates.actorType, 'npc')
    ));

  return actors
    .filter(a => a.scheduleData || a.scheduleTemplateId)
    .map(a => ({
      npcId: a.actorId,
      schedule: a.scheduleData as NpcSchedule | undefined,
      scheduleRef: a.scheduleRef as NpcScheduleRef | undefined,
      homeLocationId: a.homeLocationId,
      workLocationId: a.workLocationId,
    }));
}

// Get game time for session
export async function getSessionGameTime(sessionId: string): Promise<GameTime | null> {
  const row = await drizzle
    .select({ gameTime: worldSimStates.gameTime })
    .from(worldSimStates)
    .where(eq(worldSimStates.sessionId, sessionId))
    .limit(1);

  return row[0]?.gameTime ?? null;
}
```

## Integration Points

### API Server Startup

```typescript
// In packages/api/src/index.ts or startup file
import { Scheduler } from '@minimal-rpg/services';
import { tickEmitter } from '@minimal-rpg/services';

// Start scheduler
Scheduler.start();

// Start tick emitter (if not already running)
tickEmitter.start(5000); // Tick every 5 seconds
```

### WorldBus Event Types

Add to schemas if not present:

```typescript
interface MoveIntentEvent extends BaseEvent {
  type: 'MOVE_INTENT';
  actorId: string;
  fromLocationId: string;
  toLocationId: string;
  reason?: 'schedule' | 'player' | 'ai';
}

interface NpcActivityChangedEvent extends BaseEvent {
  type: 'NPC_ACTIVITY_CHANGED';
  actorId: string;
  previousActivity?: string;
  newActivity: string;
}
```

## Testing

```typescript
describe('Scheduler', () => {
  beforeEach(async () => {
    await clearTestData();
    await createTestSession();
  });

  it('should emit MOVE_INTENT when NPC schedule changes location', async () => {
    const events: WorldEvent[] = [];
    worldBus.subscribe(e => events.push(e));

    // Create NPC with shopkeeper schedule at hour 7 (should be at home)
    await createTestNpc({
      scheduleRef: { templateId: 'template-shopkeeper', placeholders: { ... } }
    });

    // Process at hour 8 (shop opens)
    await Scheduler.processSchedules('session-1', 1);

    const moveEvent = events.find(e => e.type === 'MOVE_INTENT');
    expect(moveEvent).toBeDefined();
    expect(moveEvent?.toLocationId).toBe('shop-location');
  });

  it('should not emit duplicate events on rapid ticks', async () => {
    const events: WorldEvent[] = [];
    worldBus.subscribe(e => events.push(e));

    // Process twice rapidly
    await Promise.all([
      Scheduler.processSchedules('session-1', 1),
      Scheduler.processSchedules('session-1', 2),
    ]);

    const moveEvents = events.filter(e => e.type === 'MOVE_INTENT');
    expect(moveEvents.length).toBeLessThanOrEqual(1);
  });
});
```

## Acceptance Criteria

- [x] Scheduler subscribes to TICK events
- [x] NPCs with schedules are resolved each tick
- [x] MOVE_INTENT emitted when location changes
- [x] NPC_ACTIVITY_CHANGED emitted when activity changes
- [x] Concurrent processing prevented
- [x] Performance < 100ms for 20 NPCs
- [x] Unit tests pass

## Notes

- Moved schedule resolution logic into @minimal-rpg/services to avoid a circular dependency between @minimal-rpg/services and @minimal-rpg/api. The API schedule-service now re-exports from services to keep imports stable.
- No blockers encountered.
- Consider batching DB updates for performance
- May need throttling if ticks are frequent
- Activity changes feed into AmbientCollector for narration
