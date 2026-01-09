/**
 * Actor State Type Definitions
 *
 * These types define the shape of the JSON stored in actor_states.state column.
 * The column is typed as `unknown` in Drizzle, so we need these types to safely access properties.
 */
import type {
  CharacterProfile,
  NpcSchedule,
  PlayerInterestScore,
  NpcLocationState,
  GameTime,
} from '@minimal-rpg/schemas';

/**
 * Affinity record stored per-actor relationship.
 */
export interface AffinityRecord {
  relationshipType: string;
  affinity: {
    trust: number;
    fondness: number;
    fear: number;
  };
  createdAt: string;
}

/**
 * NPC actor state shape.
 * Stored in actor_states.state when actorType === 'npc'.
 */
export interface NpcActorState {
  /** Role in the session */
  role: 'primary' | 'supporting' | 'background' | 'antagonist';
  /** NPC tier for detail level */
  tier: 'major' | 'minor' | 'transient' | 'background';
  /** Display name */
  name: string;
  /** Optional label for identifying this NPC instance */
  label?: string | null;
  /** Serialized character profile (legacy, for display) */
  profileJson?: string;
  /** Current location state */
  location?: {
    currentLocationId: string;
  };
  /** NPC schedule data */
  schedule?: {
    templateId?: string;
    scheduleData?: NpcSchedule;
    placeholderMappings?: Record<string, string>;
  };
  /** Player interest score for this NPC */
  interest?: PlayerInterestScore;
  /** Last known location state */
  locationState?: NpcLocationState;
  /** Simulation state */
  simulation?: {
    currentState?: NpcLocationState;
    lastComputedAt?: GameTime;
    dayDecisions?: Record<string, unknown>;
  };
  /** Affinity toward other actors */
  affinity?: Record<string, AffinityRecord>;
  /** Actor status */
  status: 'active' | 'inactive';
}

/**
 * Player actor state shape.
 * Stored in actor_states.state when actorType === 'player'.
 */
export interface PlayerActorState {
  /** Player profile data */
  profile: CharacterProfile | Record<string, unknown>;
  /** Actor status */
  status: 'active' | 'inactive';
}

/**
 * Union type for all actor states.
 */
export type ActorState = NpcActorState | PlayerActorState;

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
