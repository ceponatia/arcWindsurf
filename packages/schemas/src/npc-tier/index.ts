/**
 * NPC Tier System Module
 *
 * Exports all tier-related types, schemas, utilities, and defaults.
 *
 * @example
 * ```typescript
 * import {
 *   NpcTier,
 *   NpcTierConfig,
 *   PlayerInterestScore,
 *   updateInterestScore,
 *   checkPromotion,
 *   NPC_TIER_DEFAULTS,
 * } from '@minimal-rpg/schemas/npc-tier';
 * ```
 */

// Types
export type {
  NpcTier,
  ProfileDepth,
  NpcTierConfig,
  PlayerInterestScore,
  InterestConfig,
  PromotionThresholds,
  InteractionType,
  InteractionEvent,
  PromotionCheck,
  ProfileExpansionTask,
  PromotionResult,
  SimulationPriority,
  SimulationStrategy,
  TransientNpcProfile,
} from './types.js';

// Schemas
export {
  NpcTierSchema,
  ProfileDepthSchema,
  NpcTierConfigSchema,
  PromotionThresholdsSchema,
  InterestConfigSchema,
  PlayerInterestScoreSchema,
  InteractionTypeSchema,
  InteractionEventSchema,
  PromotionCheckSchema,
  ProfileExpansionTaskSchema,
  PromotionResultSchema,
  SimulationPrioritySchema,
  SimulationStrategySchema,
  TransientNpcProfileSchema,
} from './schemas.js';

// Schema types (for when you need inferred types from schemas)
export type {
  NpcTierSchemaType,
  ProfileDepthSchemaType,
  NpcTierConfigSchemaType,
  PromotionThresholdsSchemaType,
  InterestConfigSchemaType,
  PlayerInterestScoreSchemaType,
  InteractionTypeSchemaType,
  InteractionEventSchemaType,
  PromotionCheckSchemaType,
  ProfileExpansionTaskSchemaType,
  PromotionResultSchemaType,
  SimulationPrioritySchemaType,
  SimulationStrategySchemaType,
  TransientNpcProfileSchemaType,
} from './schemas.js';

// Defaults
export {
  NPC_TIER_DEFAULTS,
  DEFAULT_INTEREST_CONFIG,
  createInitialInterestScore,
  getTierConfig,
  getNextTier,
  canPromote,
} from './defaults.js';

// Utilities
export {
  // Interest scoring
  isMeaningfulInteraction,
  calculateBleedRate,
  updateInterestScore,
  estimateTurnsToHalfScore,
  // Promotion
  getPromotionThreshold,
  checkPromotion,
  getFieldsToGenerate,
  // Simulation priority
  getTierMinimumPriority,
  adjustSimulationPriority,
  getSimulationStrategy,
  createSimulationPriority,
  updateSimulationPriorityOnInteraction,
} from './utils.js';
