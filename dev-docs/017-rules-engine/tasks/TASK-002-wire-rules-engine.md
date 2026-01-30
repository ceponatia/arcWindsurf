# TASK-002: Wire RulesEngine to WorldBus

**Priority**: P1
**Status**: ✅ Complete
**Estimate**: 2-3 hours
**Depends On**: TASK-001 (Core Validators)
**Category**: Rules Engine

---

## Objective

Connect RulesEngine to validate intents from WorldBus and emit ACTION_REJECTED events for invalid actions.

## Current Code

```typescript
// packages/services/src/rules/rules-engine.ts
private handler = async (event: WorldEvent): Promise<void> => {
  // TODO: Implement rule validation based on event.type
  console.debug(`[RulesEngine] Received event: ${event.type}`);
  await Promise.resolve();
};
```

## Target Implementation

```typescript
import { worldBus } from '@minimal-rpg/bus';
import { type WorldEvent } from '@minimal-rpg/schemas';
import { Validators, type ValidationContext } from './validators.js';
import {
  getActorState,
  getActorsAtLocation,
  getInventoryItems,
  getSessionGameTime,
} from '@minimal-rpg/db';

/**
 * Rules Engine Service
 *
 * Validates intents and rejects invalid actions.
 */
export class RulesEngine {
  private started = false;

  private handler = async (event: WorldEvent): Promise<void> => {
    // Only validate *_INTENT events
    if (!event.type.endsWith('_INTENT')) {
      return;
    }

    const sessionId = event.sessionId;
    const actorId = (event as { actorId?: string }).actorId;

    if (!sessionId || !actorId) {
      console.warn(`[RulesEngine] Missing sessionId or actorId in ${event.type}`);
      return;
    }

    try {
      // Build validation context
      const context = await this.buildContext(sessionId, actorId);

      // Validate
      const result = await Validators.validateAction(event, context);

      if (!result.valid) {
        console.debug(`[RulesEngine] Rejected ${event.type}: ${result.reason}`);

        // Emit rejection event
        await worldBus.emit({
          type: 'ACTION_REJECTED',
          originalEventType: event.type,
          actorId,
          reason: result.reason,
          suggestion: result.suggestion,
          sessionId,
          timestamp: new Date(),
        });

        // Future: Could stop event propagation here if WorldBus supports it
      }
    } catch (error) {
      console.error(`[RulesEngine] Error validating ${event.type}:`, error);
      // On error, allow the action (fail open for now)
    }
  };

  /**
   * Build validation context from session state.
   */
  private async buildContext(
    sessionId: string,
    actorId: string
  ): Promise<ValidationContext> {
    // Get actor's current state
    const actorState = await getActorState(sessionId, actorId);
    const currentLocationId = actorState?.locationId ?? 'unknown';

    // Get actors at current location
    const actorsAtLocation = await getActorsAtLocation(sessionId, currentLocationId);
    const actorIds = actorsAtLocation
      .map(a => a.actorId)
      .filter(id => id !== actorId);

    // Get actor's inventory
    const inventory = await getInventoryItems(sessionId, actorId);
    const inventoryItemIds = inventory.map(i => i.itemId);

    // Get game time
    const gameTime = await getSessionGameTime(sessionId);

    return {
      sessionId,
      actorId,
      currentLocationId,
      actorsAtLocation: actorIds,
      inventoryItemIds,
      gameTime: gameTime ?? undefined,
    };
  }

  /**
   * Start the rules engine.
   */
  start(): void {
    if (this.started) return;
    void worldBus.subscribe(this.handler);
    this.started = true;
    console.log('[RulesEngine] Started');
  }

  /**
   * Stop the rules engine.
   */
  stop(): void {
    if (!this.started) return;
    worldBus.unsubscribe(this.handler);
    this.started = false;
    console.log('[RulesEngine] Stopped');
  }
}

export const rulesEngine = new RulesEngine();
```

## Event Schema Addition

Add to WorldEvent types:

```typescript
interface ActionRejectedEvent extends BaseEvent {
  type: 'ACTION_REJECTED';
  originalEventType: string;
  actorId: string;
  reason: string;
  suggestion?: string;
}
```

## Integration

### API Startup

```typescript
// In API startup
import { rulesEngine } from '@minimal-rpg/services';

rulesEngine.start();
```

### Client Handling

Clients should listen for ACTION_REJECTED to show feedback:

```typescript
worldBus.subscribe(event => {
  if (event.type === 'ACTION_REJECTED') {
    showError(event.reason);
    if (event.suggestion) {
      showHint(event.suggestion);
    }
  }
});
```

## Testing

```typescript
describe('RulesEngine', () => {
  beforeEach(() => {
    rulesEngine.start();
  });

  afterEach(() => {
    rulesEngine.stop();
  });

  it('should emit ACTION_REJECTED for invalid MOVE_INTENT', async () => {
    const events: WorldEvent[] = [];
    worldBus.subscribe(e => events.push(e));

    // Emit invalid move
    await worldBus.emit({
      type: 'MOVE_INTENT',
      actorId: 'player',
      toLocationId: 'unreachable-location',
      sessionId: 'test-session',
      timestamp: new Date(),
    });

    // Wait for async processing
    await new Promise(r => setTimeout(r, 100));

    const rejection = events.find(e => e.type === 'ACTION_REJECTED');
    expect(rejection).toBeDefined();
    expect(rejection?.reason).toContain('Cannot reach');
  });

  it('should not emit rejection for valid intents', async () => {
    const events: WorldEvent[] = [];
    worldBus.subscribe(e => events.push(e));

    // Mock valid location connection
    mockLocationConnection('tavern', 'street');

    await worldBus.emit({
      type: 'MOVE_INTENT',
      actorId: 'player',
      fromLocationId: 'tavern',
      toLocationId: 'street',
      sessionId: 'test-session',
      timestamp: new Date(),
    });

    await new Promise(r => setTimeout(r, 100));

    const rejection = events.find(e => e.type === 'ACTION_REJECTED');
    expect(rejection).toBeUndefined();
  });
});
```

## Acceptance Criteria

- [x] RulesEngine validates all *_INTENT events
- [x] ValidationContext built from DB queries
- [x] ACTION_REJECTED emitted for invalid actions
- [x] Engine can be started/stopped
- [x] Errors don't crash the engine
- [x] Unit tests pass

## Notes

- Kept location extraction logic aligned with actor state shape to avoid relying on a top-level `locationId` field.
- Inventory item IDs map to the schema `id` field rather than a non-existent `itemId` field.
- Consider caching context for repeated validations in same tick
- May need to integrate with event processing pipeline for blocking
- ACTION_REJECTED events should reach the originating client
