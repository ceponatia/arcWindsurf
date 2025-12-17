/**
 * NPC Simulation Schemas
 *
 * Zod validation schemas for simulation types.
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 */
import { z } from 'zod';
import { GameTimeSchema } from '../time/schemas.js';
import { NpcTierSchema, SimulationStrategySchema } from '../npc-tier/schemas.js';
import { NpcLocationStateSchema } from '../state/npc-location.js';

// Re-export SimulationStrategySchema from npc-tier for convenience
export { SimulationStrategySchema };

// =============================================================================
// Trigger and Strategy Schemas
// =============================================================================

/**
 * Events that trigger NPC simulation updates.
 */
export const SimulationTriggerSchema = z.enum([
  'turn',
  'period-change',
  'location-change',
  'time-skip',
]);

// =============================================================================
// Configuration Schemas
// =============================================================================

/**
 * Simulation configuration for a single tier.
 */
export const TierSimulationConfigSchema = z.object({
  strategy: SimulationStrategySchema,
  cacheMinutes: z.number().int().min(0),
  updateOn: z.array(SimulationTriggerSchema),
  async: z.boolean(),
});

/**
 * Complete simulation configuration by tier.
 */
export const TieredSimulationConfigSchema = z.object({
  major: TierSimulationConfigSchema,
  minor: TierSimulationConfigSchema,
  background: TierSimulationConfigSchema,
  transient: TierSimulationConfigSchema,
});

/**
 * Performance budget for simulation processing.
 */
export const SimulationBudgetConfigSchema = z.object({
  maxNpcsPerTick: z.number().int().min(1),
  simulationRadius: z.number().int().min(0),
  cacheDurationMinutes: z.number().int().min(0),
  timeSkipBatchSize: z.number().int().min(1),
});

// =============================================================================
// Priority Schemas
// =============================================================================

/**
 * Computed simulation priority for an NPC.
 */
export const NpcSimulationPrioritySchema = z.object({
  npcId: z.string().min(1),
  basePriority: z.number().int().min(0),
  currentPriority: z.number().min(0),
  lastInteractionTurn: z.number().int().min(0),
  distanceFromPlayer: z.number().int().min(0),
});

// =============================================================================
// Result Schemas
// =============================================================================

/**
 * Result of simulating a single NPC.
 */
export const NpcSimulationResultSchema = z.object({
  npcId: z.string().min(1),
  previousState: NpcLocationStateSchema,
  newState: NpcLocationStateSchema,
  stateChanged: z.boolean(),
  trigger: SimulationTriggerSchema,
});

/**
 * Result of processing a simulation tick.
 */
export const SimulationTickResultSchema = z.object({
  majorResults: z.array(NpcSimulationResultSchema),
  minorQueued: z.number().int().min(0),
  backgroundQueued: z.number().int().min(0),
  processedAt: GameTimeSchema,
});

// =============================================================================
// Time Skip Schemas
// =============================================================================

/**
 * State change during a time skip.
 */
export const NpcStateChangeSchema = z.object({
  npcId: z.string().min(1),
  previousState: NpcLocationStateSchema,
  newState: NpcLocationStateSchema,
  intermediateLocations: z.array(z.string().min(1)).optional(),
});

/**
 * Event that occurred during simulated time skip.
 */
export const SimulatedEventSchema = z.object({
  time: GameTimeSchema,
  type: z.string().min(1),
  description: z.string().min(1),
  involvedNpcs: z.array(z.string().min(1)),
});

/**
 * Complete result of time skip simulation.
 */
export const TimeSkipSimulationSchema = z.object({
  stateChanges: z.array(NpcStateChangeSchema),
  events: z.array(SimulatedEventSchema),
  fromTime: GameTimeSchema,
  toTime: GameTimeSchema,
});

// =============================================================================
// Task Schemas
// =============================================================================

/**
 * Task in the async simulation queue.
 */
export const SimulationTaskSchema = z.object({
  npcId: z.string().min(1),
  time: GameTimeSchema,
  trigger: SimulationTriggerSchema,
  priority: z.number().min(0),
});

// =============================================================================
// Fidelity Schemas
// =============================================================================

/**
 * Simulation fidelity based on distance from player.
 */
export const SimulationFidelitySchema = z.enum(['full', 'cached', 'coarse', 'none']);

/**
 * Distance-based fidelity mapping.
 */
export const FidelityByDistanceSchema = z.object({
  sameLocation: SimulationFidelitySchema,
  adjacent: SimulationFidelitySchema,
  sameArea: SimulationFidelitySchema,
  distant: SimulationFidelitySchema,
});

// =============================================================================
// Cache Schemas
// =============================================================================

/**
 * Cached simulation result with metadata.
 */
export const CachedSimulationSchema = z.object({
  state: NpcLocationStateSchema,
  computedAt: GameTimeSchema,
  expiresAt: GameTimeSchema,
  fidelity: SimulationFidelitySchema,
});

/**
 * Cache invalidation event.
 */
export const CacheInvalidationEventSchema = z.object({
  type: z.enum(['period-change', 'weather-change', 'flag-change', 'location-change']),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// NPC Info Schema
// =============================================================================

/**
 * NPC information needed for simulation.
 */
export const NpcSimulationInfoSchema = z.object({
  id: z.string().min(1),
  tier: NpcTierSchema,
  scheduleId: z.string().optional(),
  locationId: z.string().min(1),
  tierPriority: z.number().int().min(0),
  turnsSinceInteraction: z.number().int().min(0),
});
