/**
 * NPC Tier System Zod Schemas
 *
 * Runtime validation schemas for NPC tier data.
 *
 * @see dev-docs/30-npc-tiers-and-promotion.md
 */
import { z } from 'zod';

// =============================================================================
// NPC Tier Schemas
// =============================================================================

/**
 * Schema for NPC tier classification.
 */
export const NpcTierSchema = z.enum(['major', 'minor', 'background', 'transient']);

/**
 * Schema for profile depth.
 */
export const ProfileDepthSchema = z.enum(['full', 'partial', 'minimal', 'generated']);

/**
 * Schema for NPC tier configuration.
 */
export const NpcTierConfigSchema = z.object({
  tier: NpcTierSchema,
  profileDepth: ProfileDepthSchema,
  hasSchedule: z.boolean(),
  persistState: z.boolean(),
  promotable: z.boolean(),
  simulationPriority: z.number().int().min(0).max(10),
});

// =============================================================================
// Player Interest Schemas
// =============================================================================

/**
 * Schema for promotion thresholds.
 */
export const PromotionThresholdsSchema = z.object({
  transientToBackground: z.number().min(0),
  backgroundToMinor: z.number().min(0),
  minorToMajor: z.number().min(0),
});

/**
 * Schema for interest configuration.
 */
export const InterestConfigSchema = z.object({
  pointsPerInteraction: z.number().min(0).default(3),
  meaningfulInteractionBonus: z.number().min(0).default(5),
  baseBleedRate: z.number().min(0).max(1).default(0.05),
  minBleedRate: z.number().min(0).max(1).default(0.005),
  promotionThresholds: PromotionThresholdsSchema,
});

/**
 * Schema for player interest score.
 */
export const PlayerInterestScoreSchema = z.object({
  npcId: z.string().min(1),
  score: z.number().min(0).default(0),
  totalInteractions: z.number().int().min(0).default(0),
  turnsSinceInteraction: z.number().int().min(0).default(0),
  peakScore: z.number().min(0).default(0),
});

// =============================================================================
// Interaction Event Schemas
// =============================================================================

/**
 * Schema for interaction type.
 */
export const InteractionTypeSchema = z.enum(['dialogue', 'action', 'observation']);

/**
 * Schema for interaction event.
 */
export const InteractionEventSchema = z.object({
  type: InteractionTypeSchema,
  namedNpc: z.boolean(),
  askedQuestions: z.boolean(),
  affinityChanged: z.boolean(),
  proximityEngagement: z.boolean(),
  meaningful: z.boolean(),
});

// =============================================================================
// Promotion Schemas
// =============================================================================

/**
 * Schema for promotion check result.
 */
export const PromotionCheckSchema = z.object({
  npcId: z.string().min(1),
  currentTier: NpcTierSchema,
  currentScore: z.number().min(0),
  shouldPromote: z.boolean(),
  targetTier: NpcTierSchema.optional(),
  thresholdMet: z.number().optional(),
});

/**
 * Schema for profile expansion task.
 */
export const ProfileExpansionTaskSchema = z.object({
  fieldsToGenerate: z.array(z.string()),
  existingData: z.record(z.string(), z.unknown()),
  interactionSummary: z.array(z.string()),
});

/**
 * Schema for promotion result.
 */
export const PromotionResultSchema = z.object({
  npcId: z.string().min(1),
  fromTier: NpcTierSchema,
  toTier: NpcTierSchema,
  profileExpansion: ProfileExpansionTaskSchema,
  scheduleTemplateId: z.string().optional(),
});

// =============================================================================
// Simulation Priority Schemas
// =============================================================================

/**
 * Schema for simulation priority.
 */
export const SimulationPrioritySchema = z.object({
  npcId: z.string().min(1),
  basePriority: z.number().int().min(0).max(10),
  currentPriority: z.number().min(0).max(10),
  lastInteractionTurn: z.number().int().min(0),
});

/**
 * Schema for simulation strategy.
 */
export const SimulationStrategySchema = z.enum(['eager', 'active', 'lazy', 'on-demand']);

// =============================================================================
// Transient NPC Schemas
// =============================================================================

/**
 * Schema for transient NPC profile.
 */
export const TransientNpcProfileSchema = z.object({
  name: z.string().min(1),
  species: z.string().optional(),
  adjectives: z.array(z.string()).min(1).max(3),
  appearanceSnippet: z.string().min(1),
  templateId: z.string().optional(),
  encounteredAt: z.string().min(1),
  encounteredTurn: z.number().int().min(0),
});

// =============================================================================
// Inferred Types from Schemas
// =============================================================================

export type NpcTierSchemaType = z.infer<typeof NpcTierSchema>;
export type ProfileDepthSchemaType = z.infer<typeof ProfileDepthSchema>;
export type NpcTierConfigSchemaType = z.infer<typeof NpcTierConfigSchema>;
export type PromotionThresholdsSchemaType = z.infer<typeof PromotionThresholdsSchema>;
export type InterestConfigSchemaType = z.infer<typeof InterestConfigSchema>;
export type PlayerInterestScoreSchemaType = z.infer<typeof PlayerInterestScoreSchema>;
export type InteractionTypeSchemaType = z.infer<typeof InteractionTypeSchema>;
export type InteractionEventSchemaType = z.infer<typeof InteractionEventSchema>;
export type PromotionCheckSchemaType = z.infer<typeof PromotionCheckSchema>;
export type ProfileExpansionTaskSchemaType = z.infer<typeof ProfileExpansionTaskSchema>;
export type PromotionResultSchemaType = z.infer<typeof PromotionResultSchema>;
export type SimulationPrioritySchemaType = z.infer<typeof SimulationPrioritySchema>;
export type SimulationStrategySchemaType = z.infer<typeof SimulationStrategySchema>;
export type TransientNpcProfileSchemaType = z.infer<typeof TransientNpcProfileSchema>;
