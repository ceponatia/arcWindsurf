import type { WorldEvent } from '@minimal-rpg/schemas';
import { worldBus } from '@minimal-rpg/bus';
import type { Actor } from './types.js';

/**
 * Base lifecycle manager for actors.
 * Handles WorldBus subscription/unsubscription.
 */
export class BaseActorLifecycle {
  protected started = false;
  protected handler: ((event: WorldEvent) => void) | null = null;

  constructor(protected readonly actor: Actor) {}

  /**
   * Start the actor and subscribe to WorldBus.
   */
  async start(): Promise<void> {
    if (this.started) return;

    this.handler = (event: WorldEvent) => {
      this.actor.send(event);
    };

    await worldBus.subscribe(this.handler);
    this.started = true;
  }

  /**
   * Stop the actor and unsubscribe from WorldBus.
   */
  stop(): void {
    if (!this.started || !this.handler) return;

    worldBus.unsubscribe(this.handler);
    this.handler = null;
    this.started = false;
  }

  /**
   * Check if actor is started.
   */
  isStarted(): boolean {
    return this.started;
  }
}
