import type { CharacterProfile } from '../character/index.js';
import type { NpcSchedule } from '../schedule/index.js';
import type { PlayerInterestScore } from '../npc-tier/index.js';
import type { NpcLocationState } from './npc-location.js';
import type { GameTime } from '../time/index.js';

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
 * NPC actor state shape stored in actor_states.state when actorType === 'npc'.
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
 * Player actor state shape stored in actor_states.state when actorType === 'player'.
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
