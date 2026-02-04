import type { WorldEvent } from '@minimal-rpg/schemas';
import type { Actor, ActorConfig, BaseActorState } from '../base/types.js';
import { BaseActorLifecycle } from '../base/lifecycle.js';

/**
 * Player Actor implementation.
 *
 * For Phase 3, this is a simple stub.
 * Player actors will be fleshed out when multiplayer is implemented.
 */
export class PlayerActor implements Actor {
  readonly id: string;
  readonly type = 'player' as const;
  readonly sessionId: string;

  private readonly locationId: string;
  private readonly lifecycle: BaseActorLifecycle;
  private started = false;

  constructor(config: ActorConfig) {
    this.id = config.id;
    this.sessionId = config.sessionId;
    this.locationId = config.locationId;
    this.lifecycle = new BaseActorLifecycle(this);
  }

  start(): void {
    if (this.started) return;
    void this.lifecycle.start();
    this.started = true;
  }

  stop(): void {
    if (!this.started) return;
    this.lifecycle.stop();
    this.started = false;
  }

  send(event: WorldEvent): void {
    // For now, player actors just observe events
    // In multiplayer, this would handle player-specific event processing
    console.debug(`[PlayerActor ${this.id}] received event:`, event.type);
  }

  getSnapshot(): BaseActorState {
    return {
      id: this.id,
      type: this.type,
      locationId: this.locationId,
      sessionId: this.sessionId,
      spawnedAt: new Date(),
      lastActiveAt: new Date(),
    };
  }
}
