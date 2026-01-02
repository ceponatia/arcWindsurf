/**
 * Simulation State Service
 *
 * Manages NPC simulation based on tier, handles time skip batch processing,
 * and coordinates location updates across the session.
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 */
import type {
  GameTime,
  NpcLocationState,
  SimulationTrigger,
  NpcSimulationPriority,
  NpcSimulationResult,
  TimeSkipSimulation,
  NpcStateChange,
  TieredSimulationConfig,
  NpcSimulationInfo,
  NpcTier as NpcTierNS,
} from '@minimal-rpg/schemas';

/** NPC tier type (aliased to avoid namespace collision) */
type NpcTier = NpcTierNS.NpcTier;
import {
  DEFAULT_TIERED_SIMULATION_CONFIG,
  prioritizeNpcsForSimulation,
  hasStateChanged,
  shouldUpdateOnTrigger,
  createNpcSimulationPriority,
} from '@minimal-rpg/schemas';
import type { NpcScheduleData, ScheduleResolutionOptions } from './schedule-service.js';
import { resolveNpcScheduleAtTime } from './schedule-service.js';

// =============================================================================
// Types
// =============================================================================

/**
 * NPC info for simulation service.
 */
export interface SimulationNpcInfo {
  /** NPC identifier */
  npcId: string;
  /** NPC tier */
  tier: NpcTier;
  /** Schedule data for resolving locations */
  scheduleData: NpcScheduleData;
  /** Current location state (if known) */
  currentState?: NpcLocationState | undefined;
  /** Last interaction turn with player */
  lastInteractionTurn?: number | undefined;
  /** Distance from player in location hops */
  distanceFromPlayer?: number | undefined;
}

/**
 * Options for simulation tick.
 */
export interface SimulationTickOptions {
  /** Current game time */
  currentTime: GameTime;
  /** What triggered this simulation */
  trigger: SimulationTrigger;
  /** Player's current location ID */
  playerLocationId?: string | undefined;
  /** Current turn number */
  currentTurn?: number | undefined;
  /** Schedule resolution options */
  scheduleOptions?: Partial<ScheduleResolutionOptions> | undefined;
  /** Simulation config (defaults to DEFAULT_TIERED_SIMULATION_CONFIG) */
  config?: TieredSimulationConfig | undefined;
  /** Maximum NPCs to simulate this tick */
  maxNpcs?: number | undefined;
  /** Function to calculate distance between locations (defaults to simple ID comparison) */
  locationDistanceFn?: ((from: string, to: string) => number) | undefined;
}

/**
 * Result of running simulation tick.
 */
export interface SimulationServiceResult {
  /** Results for NPCs that were simulated */
  results: NpcSimulationResult[];
  /** NPCs that were skipped (cache valid, not their trigger, etc.) */
  skipped: string[];
  /** Processed at time */
  processedAt: GameTime;
  /** NPCs queued for async processing (not yet supported) */
  asyncQueued: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a simple cache entry (with expiresAt) is still valid.
 * Used for filtering NPCs that don't need re-simulation.
 */
function isSimpleCacheValid(
  cache: { computedAt: GameTime; expiresAt: GameTime },
  currentTime: GameTime
): boolean {
  // Compare absolute time (using absoluteDay for simplicity)
  const cachedMinutes =
    cache.expiresAt.absoluteDay * 24 * 60 + cache.expiresAt.hour * 60 + cache.expiresAt.minute;
  const currentMinutes =
    currentTime.absoluteDay * 24 * 60 + currentTime.hour * 60 + currentTime.minute;

  return currentMinutes < cachedMinutes;
}

// =============================================================================
// Simulation Service
// =============================================================================

/**
 * Run simulation tick for NPCs based on tier and trigger.
 *
 * @param npcs - All NPCs to consider for simulation
 * @param options - Simulation options
 * @returns Simulation results
 */
export function runSimulationTick(
  npcs: SimulationNpcInfo[],
  options: SimulationTickOptions
): SimulationServiceResult {
  const {
    currentTime,
    trigger,
    playerLocationId,
    currentTurn = 1,
    scheduleOptions = {},
    config = DEFAULT_TIERED_SIMULATION_CONFIG,
    maxNpcs = 20,
    locationDistanceFn = defaultLocationDistance,
  } = options;

  const results: NpcSimulationResult[] = [];
  const skipped: string[] = [];
  const asyncQueued: string[] = [];

  // Convert to NpcSimulationInfo format for prioritization
  const npcInfos: NpcSimulationInfo[] = npcs.map((npc) => ({
    id: npc.npcId,
    tier: npc.tier,
    scheduleId: npc.scheduleData.schedule?.id ?? npc.scheduleData.scheduleRef?.templateId,
    locationId: npc.currentState?.locationId ?? '',
    tierPriority: getTierPriority(npc.tier),
    turnsSinceInteraction: currentTurn - (npc.lastInteractionTurn ?? 0),
  }));

  // Filter NPCs by trigger and tier config
  const eligibleNpcs = npcInfos.filter((info) => {
    const tierConfig = config[info.tier];
    return tierConfig.updateOn.includes(trigger);
  });

  // Prioritize NPCs for simulation
  const prioritized = prioritizeNpcsForSimulation(
    eligibleNpcs,
    playerLocationId ?? '',
    locationDistanceFn,
    currentTurn
  );

  // Limit to maxNpcs
  const toSimulate = prioritized.slice(0, maxNpcs);
  const toSkip = prioritized.slice(maxNpcs).map((p) => p.id);

  // Build schedule resolution options
  const fullScheduleOptions: ScheduleResolutionOptions = {
    currentTime,
    conditionContext: {
      currentTime,
      playerLocationId,
      ...scheduleOptions.conditionContext,
    },
    ...scheduleOptions,
  };

  // Simulate each NPC
  for (const priority of toSimulate) {
    const npc = npcs.find((n) => n.npcId === priority.id);
    if (!npc) {
      skipped.push(priority.id);
      continue;
    }

    // Get tier config (config keys match NpcTier values)
    const tierConfig = config[npc.tier as keyof TieredSimulationConfig];

    // Check if this should be async (not yet implemented, treat as sync)
    if (tierConfig.async) {
      asyncQueued.push(npc.npcId);
      // For now, still process synchronously
    }

    // Resolve schedule to get new state
    const resolved = resolveNpcScheduleAtTime(npc.scheduleData, fullScheduleOptions);

    if (!resolved) {
      skipped.push(npc.npcId);
      continue;
    }

    const previousState = npc.currentState ?? resolved.locationState;
    const newState = resolved.locationState;
    const stateChanged = hasStateChanged(previousState, newState);

    results.push({
      npcId: npc.npcId,
      previousState,
      newState,
      stateChanged,
      trigger,
    });
  }

  // Add explicitly skipped NPCs
  for (const npcId of toSkip) {
    skipped.push(npcId);
  }

  return {
    results,
    skipped,
    processedAt: currentTime,
    asyncQueued,
  };
}

/**
 * Run simulation for a time skip (batch process).
 * Simulates NPCs from start time to end time.
 *
 * @param npcs - All NPCs to simulate
 * @param fromTime - Start time of skip
 * @param toTime - End time of skip
 * @param options - Simulation options
 * @returns Time skip simulation results
 */
export function runTimeSkipSimulation(
  npcs: SimulationNpcInfo[],
  fromTime: GameTime,
  toTime: GameTime,
  options: Omit<SimulationTickOptions, 'currentTime' | 'trigger'>
): TimeSkipSimulation {
  const stateChanges: NpcStateChange[] = [];

  // For each NPC, resolve their state at the end time
  const scheduleOptions: ScheduleResolutionOptions = {
    currentTime: toTime,
    conditionContext: {
      currentTime: toTime,
      playerLocationId: options.playerLocationId,
      ...options.scheduleOptions?.conditionContext,
    },
  };

  for (const npc of npcs) {
    const previousState = npc.currentState;

    // Resolve schedule at end time
    const resolved = resolveNpcScheduleAtTime(npc.scheduleData, scheduleOptions);

    if (!resolved) continue;

    const newState = resolved.locationState;

    // Track state change if different
    if (previousState && hasStateChanged(previousState, newState)) {
      stateChanges.push({
        npcId: npc.npcId,
        previousState,
        newState,
        // Could compute intermediate locations if we tracked schedule changes
        intermediateLocations: undefined,
      });
    } else if (!previousState) {
      // First time seeing this NPC
      stateChanges.push({
        npcId: npc.npcId,
        previousState: newState, // Use new state as previous for first time
        newState,
      });
    }
  }

  return {
    stateChanges,
    events: [], // Events would be generated by more sophisticated simulation
    fromTime,
    toTime,
  };
}

/**
 * Get NPCs that need simulation based on trigger and current cache validity.
 *
 * @param npcs - All NPCs
 * @param trigger - Simulation trigger
 * @param currentTime - Current game time
 * @param caches - Current simulation caches (npcId -> cache)
 * @param config - Simulation config
 * @returns NPCs that need simulation
 */
export function getNpcsNeedingSimulation(
  npcs: SimulationNpcInfo[],
  trigger: SimulationTrigger,
  currentTime: GameTime,
  caches: Map<string, { computedAt: GameTime; expiresAt: GameTime }>,
  config: TieredSimulationConfig = DEFAULT_TIERED_SIMULATION_CONFIG
): SimulationNpcInfo[] {
  return npcs.filter((npc) => {
    // Check if this trigger should update this tier
    if (!shouldUpdateOnTrigger(npc.tier, trigger, config)) {
      return false;
    }

    // Check cache validity
    const cache = caches.get(npc.npcId);
    if (cache && isSimpleCacheValid(cache, currentTime)) {
      return false;
    }

    return true;
  });
}

/**
 * Build simulation priorities for a list of NPCs.
 *
 * @param npcs - NPCs to prioritize
 * @param playerLocationId - Player's current location
 * @param currentTurn - Current turn number
 * @returns Prioritized list
 */
export function buildSimulationPriorities(
  npcs: SimulationNpcInfo[],
  playerLocationId: string,
  currentTurn: number
): NpcSimulationPriority[] {
  return npcs.map((npc) => {
    // Create base priority and then adjust for recency
    const priority = createNpcSimulationPriority(
      npc.npcId,
      npc.tier,
      npc.distanceFromPlayer ?? 10 // Default to far if unknown
    );

    // Manually adjust priority based on last interaction turn
    // (createNpcSimulationPriority doesn't support this directly)
    const lastInteractionTurn = npc.lastInteractionTurn ?? 0;
    const turnsSinceInteraction = currentTurn - lastInteractionTurn;
    const recencyDecay = Math.min(turnsSinceInteraction * 0.5, priority.currentPriority * 0.3);

    return {
      ...priority,
      lastInteractionTurn,
      currentPriority: Math.max(1, priority.currentPriority - recencyDecay),
    };
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get base priority value for a tier.
 */
function getTierPriority(tier: NpcTier): number {
  switch (tier) {
    case 'major':
      return 10;
    case 'minor':
      return 5;
    case 'background':
      return 2;
    case 'transient':
      return 1;
    default:
      return 1;
  }
}

/**
 * Default location distance function (simple same/different comparison).
 */
function defaultLocationDistance(from: string, to: string): number {
  return from === to ? 0 : 5;
}
