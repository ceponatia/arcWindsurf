/**
 * NPC Location State Schemas
 *
 * Tracks where NPCs are, what they're doing, and their simulation state.
 * Enables schedule resolution, occupancy calculation, and lazy simulation.
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 * @see dev-docs/32-npc-encounters-and-occupancy.md
 */
import { z } from 'zod';
import { GameTimeSchema } from '../time/index.js';
import type { GameTime } from '../time/index.js';

// Re-export GameTime types for backwards compatibility
export { GameTimeSchema };
export type { GameTime };

// =============================================================================
// World vs Interaction Proximity
// =============================================================================

/**
 * World-level proximity: Where is the NPC relative to the player's location?
 * Used for scheduling, encounter generation, and travel.
 */
export const WorldProximitySchema = z.enum([
  'same-location',
  'adjacent',
  'same-area',
  'distant',
  'unreachable',
]);
export type WorldProximity = z.infer<typeof WorldProximitySchema>;

/**
 * Interaction proximity: How close during active interaction?
 * Used for sensory triggers, combat, and intimacy checks.
 * Only meaningful when WorldProximity is 'same-location'.
 */
export const InteractionProximitySchema = z.enum(['intimate', 'close', 'near', 'far', 'observing']);
export type InteractionProximity = z.infer<typeof InteractionProximitySchema>;

/**
 * Combined proximity state for an NPC relative to the player.
 */
export const NpcProximityStateSchema = z.object({
  /** Where in the world relative to player */
  world: WorldProximitySchema,

  /** How close during interaction (only set when world === 'same-location') */
  interaction: InteractionProximitySchema.optional(),

  /** Whether the NPC is aware of the player */
  aware: z.boolean(),

  /** Whether the player knows this NPC is present */
  playerAware: z.boolean(),
});
export type NpcProximityState = z.infer<typeof NpcProximityStateSchema>;

// =============================================================================
// NPC Activity
// =============================================================================

/**
 * Engagement level determines how interruptible an NPC is.
 * - idle: Not doing anything specific, very interruptible
 * - casual: Light activity, easily interrupted
 * - focused: Working on something, may be annoyed by interruption
 * - absorbed: Deeply engrossed, hard to get attention
 */
export const EngagementLevelSchema = z.enum(['idle', 'casual', 'focused', 'absorbed']);
export type EngagementLevel = z.infer<typeof EngagementLevelSchema>;

/**
 * Common activity types for NPCs.
 * The type field is extensible via string, but common values are enumerated.
 */
export const CommonActivityTypeSchema = z.enum([
  'idle',
  'working',
  'eating',
  'drinking',
  'sleeping',
  'traveling',
  'socializing',
  'reading',
  'shopping',
  'exercising',
  'relaxing',
  'waiting',
  'observing',
  'performing',
  'crafting',
  'studying',
  'guarding',
  'patrolling',
  'other',
]);
export type CommonActivityType = z.infer<typeof CommonActivityTypeSchema>;

/**
 * What an NPC is currently doing.
 */
export const NpcActivitySchema = z.object({
  /** Activity type identifier (can be custom or from CommonActivityType) */
  type: z.string().min(1),

  /** Human-readable description of the activity */
  description: z.string().min(1),

  /** How engaged they are (affects interruptibility) */
  engagement: EngagementLevelSchema,

  /** Optional: what they're interacting with (item, location, other NPC) */
  target: z.string().optional(),
});
export type NpcActivity = z.infer<typeof NpcActivitySchema>;

// =============================================================================
// NPC Location State
// =============================================================================

/**
 * Complete state of where an NPC is and what they're doing.
 * This is the primary state object stored per-NPC in the session.
 */
export const NpcLocationStateSchema = z.object({
  /** Primary location ID (room, building, or region) */
  locationId: z.string().min(1),

  /** Optional sub-location for more precision (e.g., specific room in a building) */
  subLocationId: z.string().optional(),

  /** What the NPC is currently doing */
  activity: NpcActivitySchema,

  /** When the NPC arrived at this location */
  arrivedAt: GameTimeSchema,

  /** Whether the NPC can be interrupted from their current activity */
  interruptible: z.boolean(),

  /** Optional: schedule slot ID that placed them here */
  scheduleSlotId: z.string().optional(),
});
export type NpcLocationState = z.infer<typeof NpcLocationStateSchema>;

// =============================================================================
// NPC Simulation State (for lazy simulation caching)
// =============================================================================

/**
 * Resolved schedule option for a time slot.
 * Used to cache decisions made during schedule resolution.
 */
export const ResolvedScheduleOptionSchema = z.object({
  /** Location the NPC will go to */
  locationId: z.string().min(1),

  /** Optional sub-location */
  subLocationId: z.string().optional(),

  /** Activity at this location */
  activity: NpcActivitySchema,
});
export type ResolvedScheduleOption = z.infer<typeof ResolvedScheduleOptionSchema>;

/**
 * Cached simulation state for an NPC.
 * Enables lazy simulation by caching schedule decisions.
 */
export const NpcSimulationStateSchema = z.object({
  /** NPC identifier */
  npcId: z.string().min(1),

  /** Last time this NPC's state was computed */
  lastComputedAt: GameTimeSchema,

  /** Current computed state */
  currentState: NpcLocationStateSchema,

  /** Cached schedule decisions for the current day (slotId -> resolved choice) */
  dayDecisions: z.record(z.string(), ResolvedScheduleOptionSchema),
});
export type NpcSimulationState = z.infer<typeof NpcSimulationStateSchema>;

// =============================================================================
// Default State Factories
// =============================================================================

/**
 * Create a default activity (idle).
 */
export function createDefaultActivity(): NpcActivity {
  return {
    type: 'idle',
    description: 'Standing around',
    engagement: 'idle',
  };
}

/**
 * Create a default NPC location state.
 */
export function createDefaultNpcLocationState(
  locationId: string,
  gameTime: GameTime
): NpcLocationState {
  return {
    locationId,
    activity: createDefaultActivity(),
    arrivedAt: gameTime,
    interruptible: true,
  };
}

/**
 * Create a default NPC simulation state.
 */
export function createDefaultNpcSimulationState(
  npcId: string,
  locationId: string,
  gameTime: GameTime
): NpcSimulationState {
  return {
    npcId,
    lastComputedAt: gameTime,
    currentState: createDefaultNpcLocationState(locationId, gameTime),
    dayDecisions: {},
  };
}
