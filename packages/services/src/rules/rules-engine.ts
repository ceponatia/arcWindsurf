import { worldBus } from '@minimal-rpg/bus';
import { type WorldEvent } from '@minimal-rpg/schemas';

/**
 * Rules Engine Service
 *
 * Validates intents and resolves game rules.
 */
export class RulesEngine {
  private started = false;

  private handler = async (event: WorldEvent): Promise<void> => {
    // TODO: Implement rule validation based on event.type
    // For now, log and acknowledge all events
    console.debug(`[RulesEngine] Received event: ${event.type}`);
    await Promise.resolve();
  };

  start(): void {
    if (this.started) return;
    void worldBus.subscribe(this.handler);
    this.started = true;
  }

  stop(): void {
    if (!this.started) return;
    worldBus.unsubscribe(this.handler);
    this.started = false;
  }
}

export const rulesEngine = new RulesEngine();
