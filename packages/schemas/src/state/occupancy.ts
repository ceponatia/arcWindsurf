/**
 * Location Occupancy Schemas
 *
 * Tracks who is at a location, who recently left, and who is expected to arrive.
 * Enables encounter narration and crowd-level classification.
 *
 * @see dev-docs/32-npc-encounters-and-occupancy.md
 */
import { z } from 'zod';
import {
  NpcActivitySchema,
  InteractionProximitySchema,
  GameTimeSchema,
  type GameTime,
} from './npc-location.js';

// =============================================================================
// Crowd Level
// =============================================================================

/**
 * Classification of how crowded a location is.
 * Used for atmospheric narration and eavesdropping mechanics.
 */
export const CrowdLevelSchema = z.enum(['empty', 'sparse', 'moderate', 'crowded', 'packed']);
export type CrowdLevel = z.infer<typeof CrowdLevelSchema>;

/**
 * Categorize crowd level based on NPC count and optional capacity.
 */
export function categorizeCrowdLevel(presentCount: number, locationCapacity?: number): CrowdLevel {
  // If we know the location's capacity, use percentage
  if (locationCapacity && locationCapacity > 0) {
    const ratio = presentCount / locationCapacity;
    if (ratio === 0) return 'empty';
    if (ratio < 0.2) return 'sparse';
    if (ratio < 0.5) return 'moderate';
    if (ratio < 0.8) return 'crowded';
    return 'packed';
  }

  // Fallback to absolute numbers
  if (presentCount === 0) return 'empty';
  if (presentCount <= 3) return 'sparse';
  if (presentCount <= 8) return 'moderate';
  if (presentCount <= 15) return 'crowded';
  return 'packed';
}

// =============================================================================
// Present NPC
// =============================================================================

/**
 * An NPC currently at a location.
 */
export const PresentNpcSchema = z.object({
  /** NPC identifier */
  npcId: z.string().min(1),

  /** What the NPC is doing */
  activity: NpcActivitySchema,

  /** When the NPC arrived */
  arrivedAt: GameTimeSchema,

  /** How close to the player (only relevant when player is at same location) */
  proximity: InteractionProximitySchema,
});
export type PresentNpc = z.infer<typeof PresentNpcSchema>;

// =============================================================================
// Recent Departure
// =============================================================================

/**
 * An NPC who recently left a location.
 * Useful for narration hints like "You just missed Marcus."
 */
export const RecentDepartureSchema = z.object({
  /** NPC identifier */
  npcId: z.string().min(1),

  /** When the NPC left */
  leftAt: GameTimeSchema,

  /** Where the NPC went */
  destination: z.string().min(1),
});
export type RecentDeparture = z.infer<typeof RecentDepartureSchema>;

// =============================================================================
// Expected Arrival
// =============================================================================

/**
 * An NPC expected to arrive at a location soon.
 * Useful for narration hints like "Captain Vance usually shows up around now."
 */
export const ExpectedArrivalSchema = z.object({
  /** NPC identifier */
  npcId: z.string().min(1),

  /** When the NPC is expected to arrive */
  expectedAt: GameTimeSchema,

  /** Where the NPC is coming from */
  fromLocation: z.string().min(1),
});
export type ExpectedArrival = z.infer<typeof ExpectedArrivalSchema>;

// =============================================================================
// Location Occupancy
// =============================================================================

/**
 * Complete occupancy state for a location.
 * Computed when player enters or during relevant queries.
 */
export const LocationOccupancySchema = z.object({
  /** Location ID this occupancy describes */
  locationId: z.string().min(1),

  /** NPCs currently at this location */
  present: z.array(PresentNpcSchema),

  /** NPCs who recently left */
  recentlyLeft: z.array(RecentDepartureSchema),

  /** NPCs expected to arrive soon */
  expectedArrivals: z.array(ExpectedArrivalSchema),

  /** Crowd level classification */
  crowdLevel: CrowdLevelSchema,

  /** Optional capacity of the location (for crowd calculation) */
  capacity: z.number().int().positive().optional(),

  /** When this occupancy was computed */
  computedAt: GameTimeSchema,
});
export type LocationOccupancy = z.infer<typeof LocationOccupancySchema>;

// =============================================================================
// Occupancy Prompt Context
// =============================================================================

/**
 * NPC info for prompt injection (minimal, denormalized).
 */
export const OccupancyNpcInfoSchema = z.object({
  /** NPC display name */
  name: z.string().min(1),

  /** Activity description */
  activity: z.string().min(1),

  /** Engagement level */
  engagement: z.string().min(1),

  /** NPC tier (major/minor/background/transient) */
  tier: z.string().optional(),
});
export type OccupancyNpcInfo = z.infer<typeof OccupancyNpcInfoSchema>;

/**
 * Departure info for prompt injection.
 */
export const OccupancyDepartureInfoSchema = z.object({
  /** NPC display name */
  name: z.string().min(1),

  /** Minutes since they left */
  leftMinutesAgo: z.number().int().min(0),

  /** Destination location name */
  destination: z.string().min(1),
});
export type OccupancyDepartureInfo = z.infer<typeof OccupancyDepartureInfoSchema>;

/**
 * Arrival info for prompt injection.
 */
export const OccupancyArrivalInfoSchema = z.object({
  /** NPC display name */
  name: z.string().min(1),

  /** Minutes until they arrive */
  arrivingInMinutes: z.number().int().min(0),

  /** Source location name */
  comingFrom: z.string().min(1),
});
export type OccupancyArrivalInfo = z.infer<typeof OccupancyArrivalInfoSchema>;

/**
 * Narrative hints for the LLM (not scripts).
 */
export const NarrativeHintsSchema = z.object({
  /** Whether to mention the crowd level */
  shouldMentionCrowd: z.boolean(),

  /** Whether to mention recent departures */
  shouldMentionDeparture: z.boolean(),

  /** Whether to hint at expected arrivals */
  shouldHintArrival: z.boolean(),
});
export type NarrativeHints = z.infer<typeof NarrativeHintsSchema>;

/**
 * Occupancy context formatted for LLM prompt injection.
 * This is data, not prose - the LLM writes the prose.
 */
export const OccupancyPromptContextSchema = z.object({
  /** NPCs present at the location */
  presentNpcs: z.array(OccupancyNpcInfoSchema),

  /** Recent departures */
  recentDepartures: z.array(OccupancyDepartureInfoSchema),

  /** Expected arrivals */
  expectedArrivals: z.array(OccupancyArrivalInfoSchema),

  /** Crowd level classification */
  crowdLevel: CrowdLevelSchema,

  /** Narrative hints for the LLM */
  narrativeHints: NarrativeHintsSchema,
});
export type OccupancyPromptContext = z.infer<typeof OccupancyPromptContextSchema>;

// =============================================================================
// Default Factories
// =============================================================================

/**
 * Create an empty location occupancy.
 */
export function createEmptyOccupancy(locationId: string, gameTime: GameTime): LocationOccupancy {
  return {
    locationId,
    present: [],
    recentlyLeft: [],
    expectedArrivals: [],
    crowdLevel: 'empty',
    computedAt: gameTime,
  };
}

/**
 * Create default narrative hints based on occupancy data.
 */
export function createNarrativeHints(
  presentCount: number,
  recentDepartures: RecentDeparture[],
  expectedArrivals: ExpectedArrival[],
  getNpcTier: (npcId: string) => string
): NarrativeHints {
  // Check for significant recent departures (within 5 minutes, non-transient)
  const shouldMentionDeparture = recentDepartures.some((d) => {
    const tier = getNpcTier(d.npcId);
    return tier !== 'transient';
  });

  // Check for significant expected arrivals (within 10 minutes, major NPC)
  const shouldHintArrival = expectedArrivals.some((a) => {
    const tier = getNpcTier(a.npcId);
    return tier === 'major';
  });

  return {
    shouldMentionCrowd: presentCount > 3,
    shouldMentionDeparture,
    shouldHintArrival,
  };
}

// =============================================================================
// Occupancy Calculation Utilities
// =============================================================================

/**
 * Calculate minutes between two game times.
 */
function calculateMinutesBetween(from: GameTime, to: GameTime): number {
  const fromMinutes = from.absoluteDay * 24 * 60 + from.hour * 60 + from.minute;
  const toMinutes = to.absoluteDay * 24 * 60 + to.hour * 60 + to.minute;
  return toMinutes - fromMinutes;
}

/**
 * Build occupancy prompt context from raw occupancy data.
 * This transforms IDs into names and computes time deltas.
 *
 * @param occupancy - Raw occupancy data
 * @param currentTime - Current game time
 * @param getNpcName - Function to get NPC display name
 * @param getNpcTier - Function to get NPC tier
 * @param getLocationName - Function to get location display name
 * @returns Occupancy context formatted for LLM prompts
 */
export function buildOccupancyPromptContext(
  occupancy: LocationOccupancy,
  currentTime: GameTime,
  getNpcName: (npcId: string) => string,
  getNpcTier: (npcId: string) => string,
  getLocationName: (locationId: string) => string
): OccupancyPromptContext {
  const presentNpcs: OccupancyNpcInfo[] = occupancy.present.map((p) => ({
    name: getNpcName(p.npcId),
    activity: p.activity.description,
    engagement: p.activity.engagement,
    tier: getNpcTier(p.npcId),
  }));

  const recentDepartures: OccupancyDepartureInfo[] = occupancy.recentlyLeft.map((d) => ({
    name: getNpcName(d.npcId),
    leftMinutesAgo: Math.max(0, calculateMinutesBetween(d.leftAt, currentTime)),
    destination: getLocationName(d.destination),
  }));

  const expectedArrivals: OccupancyArrivalInfo[] = occupancy.expectedArrivals.map((a) => ({
    name: getNpcName(a.npcId),
    arrivingInMinutes: Math.max(0, calculateMinutesBetween(currentTime, a.expectedAt)),
    comingFrom: getLocationName(a.fromLocation),
  }));

  const narrativeHints = createNarrativeHints(
    occupancy.present.length,
    occupancy.recentlyLeft,
    occupancy.expectedArrivals,
    getNpcTier
  );

  return {
    presentNpcs,
    recentDepartures,
    expectedArrivals,
    crowdLevel: occupancy.crowdLevel,
    narrativeHints,
  };
}

/**
 * Filter recent departures to only show those within a time threshold.
 *
 * @param departures - All recent departures
 * @param currentTime - Current game time
 * @param maxMinutesAgo - Maximum minutes ago to include (default 30)
 * @returns Filtered departures
 */
export function filterRecentDepartures(
  departures: readonly RecentDeparture[],
  currentTime: GameTime,
  maxMinutesAgo = 30
): RecentDeparture[] {
  return departures.filter((d) => {
    const minutesAgo = calculateMinutesBetween(d.leftAt, currentTime);
    return minutesAgo >= 0 && minutesAgo <= maxMinutesAgo;
  });
}

/**
 * Filter expected arrivals to only show those within a time threshold.
 *
 * @param arrivals - All expected arrivals
 * @param currentTime - Current game time
 * @param maxMinutesAhead - Maximum minutes ahead to include (default 60)
 * @returns Filtered arrivals
 */
export function filterExpectedArrivals(
  arrivals: readonly ExpectedArrival[],
  currentTime: GameTime,
  maxMinutesAhead = 60
): ExpectedArrival[] {
  return arrivals.filter((a) => {
    const minutesUntil = calculateMinutesBetween(currentTime, a.expectedAt);
    return minutesUntil >= 0 && minutesUntil <= maxMinutesAhead;
  });
}

/**
 * Sort present NPCs by tier (major first) then by engagement (idle first).
 *
 * @param npcs - Present NPCs
 * @param getNpcTier - Function to get NPC tier
 * @returns Sorted NPCs
 */
export function sortPresentNpcs(
  npcs: readonly PresentNpc[],
  getNpcTier: (npcId: string) => string
): PresentNpc[] {
  const tierOrder: Record<string, number> = {
    major: 0,
    minor: 1,
    background: 2,
    transient: 3,
  };

  const engagementOrder: Record<string, number> = {
    idle: 0,
    casual: 1,
    focused: 2,
    absorbed: 3,
  };

  return [...npcs].sort((a, b) => {
    const tierA = tierOrder[getNpcTier(a.npcId)] ?? 99;
    const tierB = tierOrder[getNpcTier(b.npcId)] ?? 99;
    if (tierA !== tierB) return tierA - tierB;

    const engA = engagementOrder[a.activity.engagement] ?? 99;
    const engB = engagementOrder[b.activity.engagement] ?? 99;
    return engA - engB;
  });
}
