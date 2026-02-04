/**
 * Actor State Type Definitions
 *
 * These types define the shape of the JSON stored in actor_states.state column.
 * The column is typed as `unknown` in Drizzle, so we need these types to safely access properties.
 */
import type { ActorState, NpcActorState, PlayerActorState } from '@minimal-rpg/schemas';

export type { ActorState, AffinityRecord, NpcActorState, PlayerActorState } from '@minimal-rpg/schemas';

/**
 * Type guard to check if an actor state is an NPC state.
 *
 * @example
 * const state = actorRow.state as ActorState;
 * if (isNpcState(state)) {
 *   console.log(state.tier); // TypeScript knows this is NpcActorState
 * }
 */
export function isNpcState(state: ActorState): state is NpcActorState {
  return 'tier' in state || 'role' in state;
}

/**
 * Type guard to check if an actor state is a player state.
 */
export function isPlayerState(state: ActorState): state is PlayerActorState {
  return 'profile' in state && !('tier' in state);
}

/**
 * Safely cast unknown state to ActorState.
 * Use this when retrieving state from database.
 *
 * @example
 * const state = asActorState(actorRow.state);
 * if (isNpcState(state)) { ... }
 */
export function asActorState(state: unknown): ActorState {
  return state as ActorState;
}

/**
 * Safely cast unknown state to NpcActorState.
 * Only use when you KNOW the actor is an NPC.
 *
 * @example
 * // Only when actorType === 'npc'
 * const npcState = asNpcState(actorRow.state);
 */
export function asNpcState(state: unknown): NpcActorState {
  return state as NpcActorState;
}

/**
 * Safely cast unknown state to PlayerActorState.
 * Only use when you KNOW the actor is a player.
 */
export function asPlayerState(state: unknown): PlayerActorState {
  return state as PlayerActorState;
}
