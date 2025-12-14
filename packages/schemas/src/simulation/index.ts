/**
 * NPC Simulation Module
 *
 * Types, schemas, utilities, and defaults for NPC simulation.
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 */

// Types
export type {
  CachedSimulation,
  CacheInvalidationEvent,
  FidelityByDistance,
  NpcSimulationInfo,
  NpcSimulationPriority,
  NpcSimulationResult,
  NpcStateChange,
  SimulatedEvent,
  SimulationBudgetConfig,
  SimulationFidelity,
  SimulationStrategy,
  SimulationTask,
  SimulationTickResult,
  SimulationTrigger,
  TieredSimulationConfig,
  TierSimulationConfig,
  TimeSkipSimulation,
} from './types.js';

// Schemas
export {
  CachedSimulationSchema,
  CacheInvalidationEventSchema,
  FidelityByDistanceSchema,
  NpcSimulationInfoSchema,
  NpcSimulationPrioritySchema,
  NpcSimulationResultSchema,
  NpcStateChangeSchema,
  SimulatedEventSchema,
  SimulationBudgetConfigSchema,
  SimulationFidelitySchema,
  SimulationStrategySchema,
  SimulationTaskSchema,
  SimulationTickResultSchema,
  SimulationTriggerSchema,
  TieredSimulationConfigSchema,
  TierSimulationConfigSchema,
  TimeSkipSimulationSchema,
} from './schemas.js';

// Utilities
export {
  adjustPriorityByRecency,
  calculateCacheExpiration,
  calculateSimulationPriority,
  createCachedSimulation,
  filterNpcsByTrigger,
  getFidelityForDistance,
  getStrategyFromPriority,
  hasStateChanged,
  isCacheValid,
  isSameSlot,
  minutesBetween,
  prioritizeNpcsForSimulation,
} from './utils.js';

// Defaults
export {
  createNpcSimulationPriority,
  DEFAULT_FIDELITY_BY_DISTANCE,
  DEFAULT_SIMULATION_BUDGET,
  DEFAULT_TIERED_SIMULATION_CONFIG,
  getSimulationTierConfig,
  shouldUpdateOnTrigger,
  TIER_BASE_PRIORITY,
  TIER_MINIMUM_PRIORITY,
} from './defaults.js';
