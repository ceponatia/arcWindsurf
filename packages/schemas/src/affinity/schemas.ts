/**
 * Affinity and Relationship Schemas
 *
 * Zod schemas for validating affinity-related data structures.
 *
 * @see dev-docs/28-affinity-and-relationship-dynamics.md
 */
import { z } from 'zod';
import { GameTimeSchema } from '../time/schemas.js';
import type {
  RelationshipScores,
  Disposition,
  DispositionModifier,
  DispositionLevel,
  AffinityEffect,
  PersonalityAffinityModifier,
  AffinityCondition,
  ActionHistory,
  DiminishingReturnsConfig,
  AffinityUnlock,
  ToleranceProfile,
  AffinityDecayConfig,
  AffinityMilestone,
  CharacterInstanceAffinity,
  AffinityContext,
  DispositionWeights,
} from './types.js';

// =============================================================================
// Core Affinity Scores
// =============================================================================

/**
 * Full affinity scores schema with all dimensions.
 * Extends the basic version in awareness.ts with comfort dimension required.
 */
export const RelationshipScoresSchema = z.object({
  fondness: z
    .number()
    .min(-100)
    .max(100)
    .describe('How much the NPC likes the player (-100 to 100)'),
  trust: z.number().min(-100).max(100).describe('How much the NPC trusts the player (-100 to 100)'),
  respect: z
    .number()
    .min(-100)
    .max(100)
    .describe('How much the NPC respects the player (-100 to 100)'),
  comfort: z
    .number()
    .min(-100)
    .max(100)
    .describe('How comfortable the NPC is around the player (-100 to 100)'),
  attraction: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Romantic/physical attraction (0-100, optional)'),
  fear: z.number().min(0).max(100).describe('How afraid the NPC is (0-100)'),
}) satisfies z.ZodType<RelationshipScores>;

// =============================================================================
// Disposition
// =============================================================================

export const DispositionLevelSchema = z.enum([
  'hostile',
  'unfriendly',
  'neutral',
  'friendly',
  'close',
  'devoted',
]) satisfies z.ZodType<DispositionLevel>;

export const DispositionModifierSchema = z.object({
  source: z.string().min(1).describe('Source of the modifier'),
  effect: z.string().min(1).describe('Behavioral effect description'),
}) satisfies z.ZodType<DispositionModifier>;

export const DispositionSchema = z.object({
  level: DispositionLevelSchema,
  modifiers: z.array(DispositionModifierSchema),
  overallScore: z.number().min(-100).max(100),
}) satisfies z.ZodType<Disposition>;

// =============================================================================
// Affinity Effects
// =============================================================================

export const AffinityDimensionSchema = z.enum([
  'fondness',
  'trust',
  'respect',
  'comfort',
  'attraction',
  'fear',
]);

export const PersonalityAffinityModifierSchema = z.object({
  trait: z.string().min(1).describe('Personality trait name'),
  highMultiplier: z.number().describe('Multiplier when trait > 0.6'),
  lowMultiplier: z.number().describe('Multiplier when trait < 0.4'),
}) satisfies z.ZodType<PersonalityAffinityModifier>;

export const AffinityConditionTypeSchema = z.enum(['current-affinity', 'context', 'frequency']);

export const AffinityConditionSchema = z.object({
  type: AffinityConditionTypeSchema,
  params: z.record(z.string(), z.unknown()),
  multiplier: z.number(),
}) satisfies z.ZodType<AffinityCondition>;

export const AffinityEffectSchema = z.object({
  dimension: AffinityDimensionSchema,
  baseChange: z.number().describe('Base change amount'),
  personalityModifiers: z.array(PersonalityAffinityModifierSchema).optional(),
  conditions: z.array(AffinityConditionSchema).optional(),
}) satisfies z.ZodType<AffinityEffect>;

// =============================================================================
// Action History
// =============================================================================

export const ActionHistorySchema = z.object({
  actionType: z.string().min(1),
  count: z.number().int().min(0),
  lastOccurred: GameTimeSchema,
}) satisfies z.ZodType<ActionHistory>;

export const DiminishingReturnsConfigSchema = z.object({
  decayFactor: z.number().min(0).max(1).describe('Decay per repeat (0.7 = 70% effectiveness)'),
  minimumEffect: z.number().min(0).max(1).describe('Minimum effect multiplier'),
  resetAfterHours: z.number().min(0).describe('Hours before full reset'),
}) satisfies z.ZodType<DiminishingReturnsConfig>;

// =============================================================================
// Unlocks
// =============================================================================

export const UnlockTypeSchema = z.enum([
  'dialogue-topic',
  'action',
  'favor',
  'secret',
  'location-access',
  'romance-option',
  'special-interaction',
]);

export const AffinityUnlockSchema = z.object({
  type: UnlockTypeSchema,
  requirements: RelationshipScoresSchema.partial(),
  blockers: RelationshipScoresSchema.partial().optional(),
  description: z.string().min(1),
});

// =============================================================================
// Tolerance
// =============================================================================

export const ToleranceProfileSchema = z.object({
  insultThreshold: z.number().int().min(0),
  boringTopicMinutes: z.number().int().min(0),
  flatteryThreshold: z.number().int().min(0),
  pryingThreshold: z.number().int().min(0),
  rejectionThreshold: z.number().int().min(0),
}) satisfies z.ZodType<ToleranceProfile>;

// =============================================================================
// Decay
// =============================================================================

export const AffinityDecayConfigSchema = z.object({
  dailyDecayRate: z.number().min(0),
  decayFloor: z.number().min(-100).max(100),
  decayCeiling: z.number().min(-100).max(100),
  dimensionMultipliers: z.record(AffinityDimensionSchema, z.number()).optional(),
});

// =============================================================================
// Milestones
// =============================================================================

export const AffinityMilestoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  effects: RelationshipScoresSchema.partial(),
  permanent: z.boolean(),
});

// =============================================================================
// Character Instance Affinity
// =============================================================================

export const CharacterInstanceAffinitySchema = z.object({
  scores: RelationshipScoresSchema,
  lastUpdated: z.string().datetime(),
  actionHistory: z.array(ActionHistorySchema),
  milestones: z.array(z.string()),
  relationshipLevel: DispositionLevelSchema,
}) satisfies z.ZodType<CharacterInstanceAffinity>;

// =============================================================================
// Prompt Context
// =============================================================================

export const AffinityContextSchema = z.object({
  relationship: DispositionLevelSchema,
  insights: z.array(z.string()),
  availableActions: z.array(z.string()),
  availableTopics: z.array(z.string()),
  tolerance: ToleranceProfileSchema,
}) satisfies z.ZodType<AffinityContext>;

// =============================================================================
// Calculation Helpers
// =============================================================================

export const DispositionWeightsSchema = z.object({
  fondness: z.number(),
  trust: z.number(),
  respect: z.number(),
  comfort: z.number(),
  attraction: z.number(),
}) satisfies z.ZodType<DispositionWeights>;
