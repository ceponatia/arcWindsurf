/**
 * Schedule State Service
 *
 * Resolves NPC schedules at the current game time and provides
 * schedule-based availability and activity information.
 *
 * @see dev-docs/27-npc-schedules-and-routines.md
 */
import type {
  GameTime,
  NpcSchedule,
  NpcScheduleRef,
  ScheduleResolution,
  ConditionContext,
  NpcLocationState,
  NpcActivity,
} from '@minimal-rpg/schemas';
import {
  resolveSchedule,
  resolveScheduleTemplate,
  DEFAULT_TEMPLATE_MAP,
  createDefaultNpcLocationState,
} from '@minimal-rpg/schemas';

// =============================================================================
// Types
// =============================================================================

/**
 * NPC schedule data for resolution.
 */
export interface NpcScheduleData {
  /** NPC identifier */
  npcId: string;
  /** Direct schedule definition (if provided) */
  schedule?: NpcSchedule;
  /** Schedule template reference (if using templates) */
  scheduleRef?: NpcScheduleRef;
  /** Home location fallback */
  homeLocationId?: string;
  /** Work location fallback */
  workLocationId?: string;
}

/**
 * Result of resolving schedules for multiple NPCs.
 */
export interface ScheduleResolutionResult {
  /** Resolved location states for each NPC */
  locationStates: Map<string, NpcLocationState>;
  /** Resolutions with details for each NPC */
  resolutions: Map<string, ScheduleResolution>;
  /** NPCs that couldn't be resolved (missing schedule/template) */
  unresolved: string[];
}

/**
 * Options for schedule resolution.
 */
export interface ScheduleResolutionOptions {
  /** Current game time */
  currentTime: GameTime;
  /** Condition context for evaluating schedule conditions */
  conditionContext?: Partial<ConditionContext>;
  /** Custom template map (defaults to DEFAULT_TEMPLATE_MAP) */
  templateMap?: Map<string, unknown>;
}

// =============================================================================
// Schedule Service
// =============================================================================

/**
 * Resolve schedule for a single NPC at the current time.
 *
 * @param npc - NPC schedule data
 * @param options - Resolution options
 * @returns Schedule resolution and location state, or null if unresolvable
 */
export function resolveNpcScheduleAtTime(
  npc: NpcScheduleData,
  options: ScheduleResolutionOptions
): { resolution: ScheduleResolution; locationState: NpcLocationState } | null {
  const { currentTime, conditionContext = {} } = options;

  // Build full condition context
  const fullContext: ConditionContext = {
    currentTime,
    ...conditionContext,
  };

  let schedule: NpcSchedule | null = null;

  // Try direct schedule first
  if (npc.schedule) {
    schedule = npc.schedule;
  }
  // Try template resolution
  else if (npc.scheduleRef) {
    const templateMap = options.templateMap ?? DEFAULT_TEMPLATE_MAP;
    // resolveScheduleTemplate expects (ref, templates)
    schedule = resolveScheduleTemplate(npc.scheduleRef, templateMap as Map<string, never>);
  }

  // If no schedule, use fallback based on home/work locations
  if (!schedule) {
    // Create a minimal fallback schedule
    const fallbackLocationId = npc.homeLocationId ?? npc.workLocationId;
    if (!fallbackLocationId) {
      return null;
    }

    // Return a simple home-based resolution
    const resolution: ScheduleResolution = {
      locationId: fallbackLocationId,
      activity: {
        type: 'idle',
        description: 'Going about their day',
        engagement: 'casual',
      },
      usedChoice: false,
    };

    const locationState = createDefaultNpcLocationState(fallbackLocationId, currentTime);

    return { resolution, locationState };
  }

  // Resolve the schedule
  const resolution = resolveSchedule(schedule, fullContext);

  // Build location state from resolution
  const locationState: NpcLocationState = {
    locationId: resolution.locationId,
    subLocationId: resolution.subLocationId,
    activity: resolution.activity,
    arrivedAt: currentTime,
    interruptible: resolution.activity.engagement !== 'absorbed',
    scheduleSlotId: resolution.matchedSlotId,
  };

  return { resolution, locationState };
}

/**
 * Resolve schedules for multiple NPCs at the current time.
 *
 * @param npcs - Array of NPC schedule data
 * @param options - Resolution options
 * @returns Batch resolution result
 */
export function resolveNpcSchedulesBatch(
  npcs: NpcScheduleData[],
  options: ScheduleResolutionOptions
): ScheduleResolutionResult {
  const locationStates = new Map<string, NpcLocationState>();
  const resolutions = new Map<string, ScheduleResolution>();
  const unresolved: string[] = [];

  for (const npc of npcs) {
    const result = resolveNpcScheduleAtTime(npc, options);

    if (result) {
      locationStates.set(npc.npcId, result.locationState);
      resolutions.set(npc.npcId, result.resolution);
    } else {
      unresolved.push(npc.npcId);
    }
  }

  return {
    locationStates,
    resolutions,
    unresolved,
  };
}

/**
 * Check if an NPC is available for interaction based on their schedule.
 *
 * @param npc - NPC schedule data
 * @param options - Resolution options
 * @returns Availability status
 */
export function checkNpcAvailability(
  npc: NpcScheduleData,
  options: ScheduleResolutionOptions
):
  | { available: true; activity: NpcActivity; locationId: string }
  | {
      available: false;
      reason: string;
      activity?: NpcActivity | undefined;
      locationId?: string | undefined;
    } {
  const result = resolveNpcScheduleAtTime(npc, options);

  if (!result) {
    return {
      available: false,
      reason: 'NPC schedule could not be resolved',
    };
  }

  const { resolution } = result;

  // Check if there's an active override making them unavailable
  if (resolution.activeOverride) {
    const override = resolution.activeOverride;
    if (override.behavior === 'unavailable') {
      return {
        available: false,
        reason: 'NPC is currently unavailable',
        activity: override.activity,
        locationId: resolution.locationId,
      };
    }
  }

  // Check engagement level
  const engagement = resolution.activity.engagement;
  if (engagement === 'absorbed') {
    return {
      available: false,
      reason: `${resolution.activity.description} (deeply focused)`,
      activity: resolution.activity,
      locationId: resolution.locationId,
    };
  }

  // Check if sleeping
  if (resolution.activity.type === 'sleeping') {
    return {
      available: false,
      reason: 'NPC is sleeping',
      activity: resolution.activity,
      locationId: resolution.locationId,
    };
  }

  return {
    available: true,
    activity: resolution.activity,
    locationId: resolution.locationId,
  };
}

/**
 * Get NPCs at a specific location based on their schedules.
 *
 * @param npcs - Array of NPC schedule data
 * @param locationId - Target location ID
 * @param options - Resolution options
 * @returns NPCs that should be at the specified location
 */
export function getNpcsAtLocationBySchedule(
  npcs: NpcScheduleData[],
  locationId: string,
  options: ScheduleResolutionOptions
): Array<{ npcId: string; activity: NpcActivity; interruptible: boolean }> {
  const result: Array<{ npcId: string; activity: NpcActivity; interruptible: boolean }> = [];

  for (const npc of npcs) {
    const resolved = resolveNpcScheduleAtTime(npc, options);
    if (resolved && resolved.resolution.locationId === locationId) {
      result.push({
        npcId: npc.npcId,
        activity: resolved.resolution.activity,
        interruptible: resolved.locationState.interruptible,
      });
    }
  }

  return result;
}
