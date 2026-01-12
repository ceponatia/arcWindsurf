import type { WorldEvent } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';

/**
 * Actor types in the simulation.
 */
export type ActorType = 'npc' | 'player' | 'system';

/**
 * Base actor state (common to all actor types).
 */
export interface BaseActorState {
  /** Unique actor identifier */
  id: string;
  /** Actor type */
  type: ActorType;
  /** Current location in the world */
  locationId: string;
  /** Session this actor belongs to */
  sessionId: string;
  /** When the actor was spawned */
  spawnedAt: Date;
  /** Last time the actor was active */
  lastActiveAt: Date;
}

/**
 * Actor lifecycle interface.
 */
export interface Actor {
  /** Unique actor ID */
  readonly id: string;
  /** Actor type */
  readonly type: ActorType;
  /** Session ID */
  readonly sessionId: string;

  /** Start the actor (begin processing events) */
  start(): void;

  /** Stop the actor (cleanup and disconnect) */
  stop(): void;

  /** Send an event to the actor */
  send(event: WorldEvent): void;

  /** Get current actor state snapshot */
  getSnapshot(): BaseActorState;
}

/**
 * Actor configuration.
 */
export interface ActorConfig {
  id: string;
  type: ActorType;
  sessionId: string;
  locationId: string;
}

/**
 * NPC actor configuration.
 */
export interface NpcActorConfig extends ActorConfig {
  npcId: string;
  profile?: CharacterProfile;
  llmProvider?: LLMProvider;
}

/**
 * Actor factory function type.
 */
export type ActorFactory = (config: ActorConfig) => Actor;
