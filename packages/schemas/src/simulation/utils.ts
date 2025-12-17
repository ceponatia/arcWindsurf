/**
 * NPC Simulation Utilities
 *
 * Functions for priority calculation, cache management, and tick processing.
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 */
import type { GameTime } from '../time/types.js';
import type { NpcTier } from '../npc-tier/types.js';
import type { NpcLocationState } from '../state/npc-location.js';
import type {
  NpcSimulationPriority,
  NpcSimulationInfo,
  SimulationFidelity,
  SimulationStrategy,
  SimulationTrigger,
  FidelityByDistance,
  CachedSimulation,
  SimulationBudgetConfig,
} from './types.js';
import {
  TIER_MINIMUM_PRIORITY,
  DEFAULT_FIDELITY_BY_DISTANCE,
  DEFAULT_SIMULATION_BUDGET,
} from './defaults.js';

// =============================================================================
// Priority Calculation
// =============================================================================

/**
 * Adjust simulation priority based on how recently the player interacted.
 * Priority decays over time but never below tier minimum.
 *
 * @param priority - Current priority state
 * @param currentTurn - Current turn number
 * @param tier - NPC tier for minimum calculation
 * @returns Adjusted priority value
 */
export function adjustPriorityByRecency(
  priority: NpcSimulationPriority,
  currentTurn: number,
  tier: NpcTier
): number {
  const turnsSince = currentTurn - priority.lastInteractionTurn;

  // Priority decays over time but never below tier minimum
  // Decay is slow: 1000 turns to reach 10% of original
  const decayFactor = Math.max(0.1, 1 - turnsSince / 1000);
  const tierMinimum = TIER_MINIMUM_PRIORITY[tier];

  return Math.max(tierMinimum, priority.basePriority * decayFactor);
}

/**
 * Calculate full simulation priority for an NPC.
 * Combines tier, proximity, and recency factors.
 *
 * @param npc - NPC simulation info
 * @param playerLocationId - Player's current location
 * @param locationDistanceFn - Function to calculate location distance
 * @param currentTurn - Current turn number
 * @returns Priority score (higher = more important)
 */
export function calculateSimulationPriority(
  npc: NpcSimulationInfo,
  playerLocationId: string,
  locationDistanceFn: (from: string, to: string) => number,
  _currentTurn: number
): number {
  let score = npc.tierPriority;
  score += 0 * _currentTurn;

  // Boost for proximity
  const distance = locationDistanceFn(npc.locationId, playerLocationId);
  score += Math.max(0, 10 - distance * 2);

  // Boost for recent interaction
  if (npc.turnsSinceInteraction < 10) {
    score += 5;
  } else if (npc.turnsSinceInteraction < 50) {
    score += 2;
  }

  // Apply decay based on time since last interaction
  const decayFactor = Math.max(0.1, 1 - npc.turnsSinceInteraction / 1000);
  const tierMinimum = TIER_MINIMUM_PRIORITY[npc.tier];

  return Math.max(tierMinimum, score * decayFactor);
}

/**
 * Prioritize NPCs for simulation based on budget constraints.
 *
 * @param npcs - All NPCs to consider
 * @param playerLocationId - Player's current location
 * @param locationDistanceFn - Function to calculate location distance
 * @param currentTurn - Current turn number
 * @param config - Budget configuration
 * @returns Sorted and trimmed list of NPCs to simulate
 */
export function prioritizeNpcsForSimulation(
  npcs: readonly NpcSimulationInfo[],
  playerLocationId: string,
  locationDistanceFn: (from: string, to: string) => number,
  currentTurn: number,
  config: SimulationBudgetConfig = DEFAULT_SIMULATION_BUDGET
): NpcSimulationInfo[] {
  // Filter by simulation radius
  const withinRadius = npcs.filter((npc) => {
    const distance = locationDistanceFn(npc.locationId, playerLocationId);
    return distance <= config.simulationRadius;
  });

  // Score and sort
  const scored = withinRadius.map((npc) => ({
    npc,
    score: calculateSimulationPriority(npc, playerLocationId, locationDistanceFn, currentTurn),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Take top N based on budget
  return scored.slice(0, config.maxNpcsPerTick).map((s) => s.npc);
}

// =============================================================================
// Fidelity Determination
// =============================================================================

/**
 * Get simulation fidelity based on distance from player.
 *
 * @param distance - Location distance (0 = same location)
 * @param fidelityConfig - Fidelity by distance configuration
 * @returns Simulation fidelity level
 */
export function getFidelityForDistance(
  distance: number,
  fidelityConfig: FidelityByDistance = DEFAULT_FIDELITY_BY_DISTANCE
): SimulationFidelity {
  if (distance === 0) return fidelityConfig.sameLocation;
  if (distance === 1) return fidelityConfig.adjacent;
  if (distance <= 3) return fidelityConfig.sameArea;
  return fidelityConfig.distant;
}

/**
 * Get simulation strategy from priority range.
 *
 * @param priority - Current priority value
 * @returns Simulation strategy
 */
export function getStrategyFromPriority(priority: number): SimulationStrategy {
  if (priority >= 8) return 'eager'; // Every turn
  if (priority >= 5) return 'active'; // Every period change
  if (priority >= 2) return 'lazy'; // On location change
  return 'on-demand'; // Only when directly queried
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Check if a cached simulation is still valid.
 *
 * @param cached - Cached simulation
 * @param currentTime - Current game time
 * @returns True if cache is still valid
 */
export function isCacheValid(cached: CachedSimulation, currentTime: GameTime): boolean {
  // Compare absolute time (using absoluteDay for simplicity)
  const cachedMinutes =
    cached.expiresAt.absoluteDay * 24 * 60 + cached.expiresAt.hour * 60 + cached.expiresAt.minute;
  const currentMinutes =
    currentTime.absoluteDay * 24 * 60 + currentTime.hour * 60 + currentTime.minute;

  return currentMinutes < cachedMinutes;
}

/**
 * Calculate cache expiration time.
 *
 * @param computedAt - When the simulation was computed
 * @param cacheDurationMinutes - How long the cache is valid
 * @returns Expiration time
 */
export function calculateCacheExpiration(
  computedAt: GameTime,
  cacheDurationMinutes: number
): GameTime {
  // Simple calculation - just add minutes
  let totalMinutes = computedAt.hour * 60 + computedAt.minute + cacheDurationMinutes;
  const daysToAdd = Math.floor(totalMinutes / (24 * 60));
  totalMinutes = totalMinutes % (24 * 60);

  return {
    ...computedAt,
    absoluteDay: computedAt.absoluteDay + daysToAdd,
    dayOfMonth: computedAt.dayOfMonth + daysToAdd, // Simplified - doesn't handle month rollover
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
}

/**
 * Create a cached simulation entry.
 *
 * @param state - Computed NPC state
 * @param computedAt - When it was computed
 * @param cacheDurationMinutes - How long to cache
 * @param fidelity - Fidelity level used
 * @returns Cached simulation entry
 */
export function createCachedSimulation(
  state: NpcLocationState,
  computedAt: GameTime,
  cacheDurationMinutes: number,
  fidelity: SimulationFidelity
): CachedSimulation {
  return {
    state,
    computedAt,
    expiresAt: calculateCacheExpiration(computedAt, cacheDurationMinutes),
    fidelity,
  };
}

// =============================================================================
// Trigger Filtering
// =============================================================================

/**
 * Filter NPCs by tier for a given trigger.
 *
 * @param npcs - All NPCs
 * @param trigger - Simulation trigger
 * @returns NPCs that should be updated for this trigger
 */
export function filterNpcsByTrigger(
  npcs: readonly NpcSimulationInfo[],
  trigger: SimulationTrigger
): {
  sync: NpcSimulationInfo[];
  async: NpcSimulationInfo[];
} {
  const sync: NpcSimulationInfo[] = [];
  const async: NpcSimulationInfo[] = [];

  for (const npc of npcs) {
    switch (npc.tier) {
      case 'major':
        // Major NPCs update on all triggers, synchronously
        sync.push(npc);
        break;

      case 'minor':
        // Minor NPCs don't update on every turn
        if (trigger !== 'turn') {
          async.push(npc);
        }
        break;

      case 'background':
        // Background NPCs only update on location change and time skip
        if (trigger === 'location-change' || trigger === 'time-skip') {
          async.push(npc);
        }
        break;

      case 'transient':
        // Transient NPCs never proactively update
        break;
    }
  }

  return { sync, async };
}

// =============================================================================
// State Comparison
// =============================================================================

/**
 * Check if NPC state changed.
 *
 * @param previous - Previous state
 * @param current - Current state
 * @returns True if state changed meaningfully
 */
export function hasStateChanged(previous: NpcLocationState, current: NpcLocationState): boolean {
  // Check location
  if (previous.locationId !== current.locationId) return true;
  if (previous.subLocationId !== current.subLocationId) return true;

  // Check activity type and engagement
  if (previous.activity.type !== current.activity.type) return true;
  if (previous.activity.engagement !== current.activity.engagement) return true;

  // Check interruptibility
  if (previous.interruptible !== current.interruptible) return true;

  return false;
}

// =============================================================================
// Time Comparison Utilities
// =============================================================================

/**
 * Check if two times are in the same schedule slot.
 * A slot is typically 1-hour granularity for coarse comparison.
 *
 * @param time1 - First time
 * @param time2 - Second time
 * @returns True if in the same slot
 */
export function isSameSlot(time1: GameTime, time2: GameTime): boolean {
  return time1.absoluteDay === time2.absoluteDay && time1.hour === time2.hour;
}

/**
 * Calculate minutes between two times.
 *
 * @param from - Start time
 * @param to - End time
 * @returns Minutes between (can be negative if to < from)
 */
export function minutesBetween(from: GameTime, to: GameTime): number {
  const fromMinutes = from.absoluteDay * 24 * 60 + from.hour * 60 + from.minute;
  const toMinutes = to.absoluteDay * 24 * 60 + to.hour * 60 + to.minute;
  return toMinutes - fromMinutes;
}
