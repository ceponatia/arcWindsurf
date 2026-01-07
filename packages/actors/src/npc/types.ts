import type { WorldEvent } from '@minimal-rpg/schemas';
import type { BaseActorState } from '../base/types.js';

/**
 * NPC-specific state extensions.
 */
export interface NpcActorState extends BaseActorState {
  type: 'npc';
  /** NPC persona/character ID */
  npcId: string;
  /** Short-term event memory */
  recentEvents: WorldEvent[];
  /** Current goals or objectives */
  goals: string[];
  /** Emotional state or mood */
  mood?: string;
}

/**
 * Perception context - what the NPC is currently aware of.
 */
export interface PerceptionContext {
  /** Events relevant to this NPC */
  relevantEvents: WorldEvent[];
  /** Nearby actors/entities */
  nearbyActors: string[];
  /** Current location state */
  locationState?: unknown;
}

/**
 * Cognition context - decision-making inputs.
 */
export interface CognitionContext {
  /** What the NPC perceived */
  perception: PerceptionContext;
  /** NPC's current state */
  state: NpcActorState;
  /** Available actions */
  availableActions: string[];
}

/**
 * Action result - intent to emit.
 */
export interface ActionResult {
  /** Intent event to emit */
  intent: WorldEvent;
  /** Optional delay before emitting */
  delayMs?: number;
}

/**
 * NPC machine context (XState).
 */
export interface NpcMachineContext {
  actorId: string;
  npcId: string;
  sessionId: string;
  locationId: string;
  recentEvents: WorldEvent[];
  perception?: PerceptionContext;
  cognition?: CognitionContext;
  pendingIntent?: WorldEvent;
}

/**
 * NPC machine events (XState).
 */
export type NpcMachineEvent =
  | { type: 'WORLD_EVENT'; event: WorldEvent }
  | { type: 'PERCEIVE' }
  | { type: 'THINK' }
  | { type: 'ACT' }
  | { type: 'WAIT'; until: Date }
  | { type: 'RESUME' };
