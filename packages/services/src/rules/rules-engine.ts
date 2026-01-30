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
      const context = await this.buildContext(sessionId, actorId);
      const result = await Validators.validateAction(event, context);

      if (!result.valid) {
        console.debug(`[RulesEngine] Rejected ${event.type}: ${result.reason}`);

        await worldBus.emit({
          type: 'ACTION_REJECTED',
          originalEventType: event.type,
          actorId,
          reason: result.reason,
          suggestion: result.suggestion,
          sessionId,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error(`[RulesEngine] Error validating ${event.type}:`, error);
      // On error, allow the action (fail open for now)
    }
  };

  private extractLocationId(state: unknown): string | null {
    if (!state || typeof state !== 'object') return null;
    const record = state as Record<string, unknown>;

    const location = record['location'];
    if (location && typeof location === 'object') {
      const locationRecord = location as Record<string, unknown>;
      if (typeof locationRecord['currentLocationId'] === 'string') {
        return locationRecord['currentLocationId'];
      }
    }

    const locationState = record['locationState'];
    if (locationState && typeof locationState === 'object') {
      const locationStateRecord = locationState as Record<string, unknown>;
      if (typeof locationStateRecord['locationId'] === 'string') {
        return locationStateRecord['locationId'];
      }
    }

    const simulation = record['simulation'];
    if (simulation && typeof simulation === 'object') {
      const simulationRecord = simulation as Record<string, unknown>;
      const currentState = simulationRecord['currentState'];
      if (currentState && typeof currentState === 'object') {
        const currentStateRecord = currentState as Record<string, unknown>;
        if (typeof currentStateRecord['locationId'] === 'string') {
          return currentStateRecord['locationId'];
        }
      }
    }

    if (typeof record['locationId'] === 'string') {
      return record['locationId'];
    }

    return null;
  }

  /**
   * Build validation context from session state.
   */
  private async buildContext(
    sessionId: string,
    actorId: string
  ): Promise<ValidationContext> {
    const actorState = await getActorState(sessionId, actorId);
    const currentLocationId =
      this.extractLocationId(actorState?.state) ?? 'unknown';

    const actorsAtLocation = await getActorsAtLocation(sessionId, currentLocationId);
    const actorIds = actorsAtLocation
      .map((actor) => actor.actorId)
      .filter((id) => id !== actorId);

    const inventory = await getInventoryItems(sessionId, actorId);
    const inventoryItemIds = inventory.map((item) => item.id);

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

  start(): void {
    if (this.started) return;
    void worldBus.subscribe(this.handler);
    this.started = true;
    console.log('[RulesEngine] Started');
  }

  stop(): void {
    if (!this.started) return;
    worldBus.unsubscribe(this.handler);
    this.started = false;
    console.log('[RulesEngine] Stopped');
  }
}

export const rulesEngine = new RulesEngine();
