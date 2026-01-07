import type { Actor, ActorConfig } from '../base/types.js';
import { NpcActor } from '../npc/npc-actor.js';
import { PlayerActor } from '../player/player-actor.js';
import { worldBus } from '@minimal-rpg/bus';
import type { WorldEvent } from '@minimal-rpg/schemas';

/**
 * Actor Registry - manages actor lifecycle and lookup.
 */
export class ActorRegistry {
  private actors = new Map<string, Actor>();
  private sessionActors = new Map<string, Set<string>>();

  /**
   * Spawn a new actor.
   */
  spawn(config: ActorConfig & { npcId?: string }): Actor {
    if (this.actors.has(config.id)) {
      throw new Error(`Actor ${config.id} already exists`);
    }

    let actor: Actor;

    if (config.type === 'npc') {
      if (!config.npcId) {
        throw new Error('npcId required for NPC actors');
      }
      actor = new NpcActor({ ...config, npcId: config.npcId });
    } else if (config.type === 'player') {
      actor = new PlayerActor(config);
    } else {
      throw new Error(`Unknown actor type: ${config.type}`);
    }

    this.actors.set(config.id, actor);

    // Track session actors
    if (!this.sessionActors.has(config.sessionId)) {
      this.sessionActors.set(config.sessionId, new Set());
    }
    this.sessionActors.get(config.sessionId)!.add(config.id);

    // Start the actor
    actor.start();

    // Emit ACTOR_SPAWN event
    const spawnEvent: WorldEvent = {
      type: 'ACTOR_SPAWN',
      sessionId: config.sessionId,
      actorId: config.id,
      actorType: config.type,
      locationId: config.locationId,
      timestamp: new Date(),
    };
    void worldBus.emit(spawnEvent);

    return actor;
  }

  /**
   * Despawn an actor.
   */
  despawn(actorId: string): void {
    const actor = this.actors.get(actorId);
    if (!actor) {
      throw new Error(`Actor ${actorId} not found`);
    }

    actor.stop();
    this.actors.delete(actorId);

    // Remove from session tracking
    const sessionActorSet = this.sessionActors.get(actor.sessionId);
    if (sessionActorSet) {
      sessionActorSet.delete(actorId);
      if (sessionActorSet.size === 0) {
        this.sessionActors.delete(actor.sessionId);
      }
    }

    // Emit ACTOR_DESPAWN event
    const despawnEvent: WorldEvent = {
      type: 'ACTOR_DESPAWN',
      sessionId: actor.sessionId,
      actorId,
      timestamp: new Date(),
    };
    void worldBus.emit(despawnEvent);
  }

  /**
   * Get an actor by ID.
   */
  get(actorId: string): Actor | undefined {
    return this.actors.get(actorId);
  }

  /**
   * Get all actors for a session.
   */
  getForSession(sessionId: string): Actor[] {
    const actorIds = this.sessionActors.get(sessionId);
    if (!actorIds) return [];

    return Array.from(actorIds)
      .map((id) => this.actors.get(id))
      .filter((a): a is Actor => a !== undefined);
  }

  /**
   * Despawn all actors for a session.
   */
  despawnSession(sessionId: string): void {
    const actors = this.getForSession(sessionId);
    for (const actor of actors) {
      this.despawn(actor.id);
    }
  }

  /**
   * Get all active actors.
   */
  getAll(): Actor[] {
    return Array.from(this.actors.values());
  }

  /**
   * Get count of active actors.
   */
  count(): number {
    return this.actors.size;
  }

  /**
   * Check if an actor exists.
   */
  has(actorId: string): boolean {
    return this.actors.has(actorId);
  }
}

/**
 * Global actor registry instance.
 */
export const actorRegistry = new ActorRegistry();
