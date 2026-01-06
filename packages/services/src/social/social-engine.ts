import { worldBus } from '@minimal-rpg/bus';
import { type WorldEvent } from '@minimal-rpg/schemas';

/**
 * Social Engine Service
 *
 * Core social logic, handling affinity, reputation, and faction updates.
 */
export class SocialEngine {
  private started = false;

  private handler = async (event: WorldEvent): Promise<void> => {
    // Basic social event handling placeholder
    if (event.type === 'TICK') {
      // Basic social event handling placeholder
      // ...
    }
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

export const socialEngine = new SocialEngine();
