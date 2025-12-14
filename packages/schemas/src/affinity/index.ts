/**
 * Affinity and Relationship System
 *
 * Multi-dimensional relationship tracking between NPCs and players.
 *
 * @module affinity
 * @see dev-docs/28-affinity-and-relationship-dynamics.md
 */

// Types
export type {
  RelationshipScores,
  AffinityLabel,
  DispositionLevel,
  DispositionModifier,
  Disposition,
  AffinityDimension,
  PersonalityAffinityModifier,
  AffinityConditionType,
  AffinityCondition,
  AffinityEffect,
  AffinityEffectsMap,
  ActionHistory,
  DiminishingReturnsConfig,
  UnlockType,
  AffinityUnlock,
  ToleranceProfile,
  AffinityDecayConfig,
  AffinityMilestone,
  CharacterInstanceAffinity,
  AffinityContext,
  DispositionWeights,
  ToleranceInput,
} from './types.js';

// Schemas
export {
  RelationshipScoresSchema,
  DispositionLevelSchema,
  DispositionModifierSchema,
  DispositionSchema,
  AffinityDimensionSchema,
  PersonalityAffinityModifierSchema,
  AffinityConditionTypeSchema,
  AffinityConditionSchema,
  AffinityEffectSchema,
  ActionHistorySchema,
  DiminishingReturnsConfigSchema,
  UnlockTypeSchema,
  AffinityUnlockSchema,
  ToleranceProfileSchema,
  AffinityDecayConfigSchema,
  AffinityMilestoneSchema,
  CharacterInstanceAffinitySchema,
  AffinityContextSchema,
  DispositionWeightsSchema,
} from './schemas.js';

// Defaults
export {
  DEFAULT_AFFINITY_SCORES,
  DEFAULT_AFFINITY_SCORES_WITH_ATTRACTION,
  DEFAULT_DISPOSITION_WEIGHTS,
  AFFINITY_EFFECTS,
  DEFAULT_DIMINISHING_RETURNS_CONFIG,
  DEFAULT_AFFINITY_DECAY_CONFIG,
  STANDARD_UNLOCKS,
  MILESTONE_EXAMPLES,
  BASE_TOLERANCE,
  AFFINITY_THRESHOLDS,
  DISPOSITION_THRESHOLDS,
} from './defaults.js';

// Utilities
export {
  calculateDisposition,
  getAffinityLabel,
  getAllAffinityLabels,
  applyAffinityEffect,
  applyAffinityEffects,
  calculateDiminishingReturns,
  calculateTolerance,
  applyAffinityDecay,
  isUnlockAvailable,
  getAvailableUnlocks,
  buildAffinityContext,
  formatAffinityPrompt,
  createDefaultRelationshipScores,
  createCharacterInstanceAffinity,
} from './utils.js';
