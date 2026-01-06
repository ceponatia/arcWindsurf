import { worldBus } from '@minimal-rpg/bus';
import { type WorldEvent } from '@minimal-rpg/schemas';

/**
 * Rules Engine Service
 *
 * Validates intents and resolves game rules.
 */
export class RulesEngine {
  private started = false;

  private handler = async (_event: WorldEvent): Promise<void> => {
    // Basic rule validation placeholder
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
