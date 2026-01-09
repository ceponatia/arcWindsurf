/**
 * NPC Simulation Defaults
 *
 * Default configurations and factory functions for the simulation system.
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 */
import { getRecord } from '../shared/record-helpers.js';
import type {
  TieredSimulationConfig,
  SimulationBudgetConfig,
  FidelityByDistance,
  NpcSimulationPriority,
} from './types.js';
import type { NpcTier } from '../npc-tier/types.js';

// =============================================================================
// Default Tier Configuration
// =============================================================================

/**
 * Default simulation configuration by tier.
 */
export const DEFAULT_TIERED_SIMULATION_CONFIG: TieredSimulationConfig = {
  major: {
    strategy: 'eager',
    cacheMinutes: 0, // Always recompute
    updateOn: ['turn', 'period-change', 'location-change', 'time-skip'],
    async: false, // Synchronous, blocking
  },
  minor: {
    strategy: 'lazy',
    cacheMinutes: 15,
    updateOn: ['period-change', 'location-change', 'time-skip'],
    async: true, // Non-blocking
  },
  background: {
    strategy: 'lazy',
    cacheMinutes: 60,
    updateOn: ['location-change', 'time-skip'],
    async: true,
  },
  transient: {
    strategy: 'on-demand',
    cacheMinutes: 0, // Generate fresh each time
    updateOn: [], // Never proactively update
    async: true,
  },
};

// =============================================================================
// Default Budget Configuration
// =============================================================================

/**
 * Default performance budget configuration.
 */
export const DEFAULT_SIMULATION_BUDGET: SimulationBudgetConfig = {
  maxNpcsPerTick: 20,
  simulationRadius: 3, // 3 locations away
  cacheDurationMinutes: 30,
  timeSkipBatchSize: 10,
};

// =============================================================================
// Default Fidelity Configuration
// =============================================================================

/**
 * Default fidelity by distance mapping.
 */
export const DEFAULT_FIDELITY_BY_DISTANCE: FidelityByDistance = {
  sameLocation: 'full', // Full schedule + choices
  adjacent: 'cached', // Full schedule, cached
  sameArea: 'coarse', // Period-level only
  distant: 'none', // No active simulation
};

// =============================================================================
// Tier Priority Mapping
// =============================================================================

/**
 * Base priority by tier.
 */
export const TIER_BASE_PRIORITY: Record<NpcTier, number> = {
  major: 10,
  minor: 5,
  background: 2,
  transient: 0,
};

/**
 * Minimum priority by tier (after decay).
 */
export const TIER_MINIMUM_PRIORITY: Record<NpcTier, number> = {
  major: 3,
  minor: 1,
  background: 0,
  transient: 0,
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a default NPC simulation priority.
 * Note: This is different from npc-tier's createSimulationPriority which creates
 * the tier-level SimulationPriority. This creates the full NpcSimulationPriority.
 */
export function createNpcSimulationPriority(
  npcId: string,
  tier: NpcTier,
  distanceFromPlayer = 0
): NpcSimulationPriority {
  const basePriority = getRecord(TIER_BASE_PRIORITY, tier);
  return {
    npcId,
    basePriority,
    currentPriority: basePriority,
    lastInteractionTurn: 0,
    distanceFromPlayer,
  };
}

/**
 * Get simulation tier configuration for a specific tier.
 */
export function getSimulationTierConfig(
  tier: NpcTier,
  config: TieredSimulationConfig = DEFAULT_TIERED_SIMULATION_CONFIG
) {
  return getRecord(config, tier);
}

/**
 * Check if a trigger should update an NPC of a given tier.
 */
export function shouldUpdateOnTrigger(
  tier: NpcTier,
  trigger: 'turn' | 'period-change' | 'location-change' | 'time-skip',
  config: TieredSimulationConfig = DEFAULT_TIERED_SIMULATION_CONFIG
): boolean {
  const tierConfig = getRecord(config, tier);
  return tierConfig.updateOn.includes(trigger);
}
