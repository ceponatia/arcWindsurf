import { createActor } from 'xstate';
import type { WorldEvent } from '@minimal-rpg/schemas';
import type { Actor, ActorConfig, BaseActorState } from '../base/types.js';
import { BaseActorLifecycle } from '../base/lifecycle.js';
import { createNpcMachine } from './npc-machine.js';
import type { NpcMachineContext } from './types.js';

/**
 * NPC Actor implementation using XState.
 */
export class NpcActor implements Actor {
  readonly id: string;
  readonly type = 'npc' as const;
  readonly sessionId: string;

  private readonly npcId: string;
  private readonly locationId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly machine: any;
  private readonly lifecycle: BaseActorLifecycle;

  constructor(config: ActorConfig & { npcId: string }) {
    this.id = config.id;
    this.sessionId = config.sessionId;
    this.npcId = config.npcId;
    this.locationId = config.locationId;

    // Create XState machine context
    const context: NpcMachineContext = {
      actorId: this.id,
      npcId: this.npcId,
      sessionId: this.sessionId,
      locationId: this.locationId,
      recentEvents: [],
    };

    // Create and start the machine
    const machineDef = createNpcMachine(context);
    this.machine = createActor(machineDef);

    this.lifecycle = new BaseActorLifecycle(this);
  }

  start(): void {
    this.machine.start();
    void this.lifecycle.start();
  }

  stop(): void {
    this.machine.stop();
    this.lifecycle.stop();
  }

  send(event: WorldEvent): void {
    this.machine.send({ type: 'WORLD_EVENT', event });
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

  /**
   * Get the current machine state (for debugging).
   */
  getMachineState(): string {
    const snapshot = this.machine.getSnapshot() as { value: unknown };
    return JSON.stringify(snapshot.value);
  }
}
