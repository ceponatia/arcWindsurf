/**
 * Affinity and Relationship Types
 *
 * Multi-dimensional relationship tracking between NPCs and players.
 * Influences NPC behavior, dialogue options, and tolerance levels.
 *
 * @see dev-docs/28-affinity-and-relationship-dynamics.md
 */
import type { GameTime } from '../time/types.js';

// =============================================================================
// Core Affinity Dimensions
// =============================================================================

/**
 * Full multi-dimensional relationship scores tracking relationship quality.
 * This is the comprehensive version used for relationship tracking.
 * Each dimension ranges from -100 to 100 (or 0-100 for fear/attraction).
 *
 * Note: A simpler RelationshipScores type exists in state/awareness.ts for
 * basic awareness calculations. This type is the canonical full version.
 */
export interface RelationshipScores {
  /** How much the NPC likes/enjoys the player's company (-100 to 100) */
  fondness: number;

  /** How much the NPC trusts the player (-100 to 100) */
  trust: number;

  /** How much the NPC respects the player (-100 to 100) */
  respect: number;

  /** How comfortable the NPC is around the player (-100 to 100) */
  comfort: number;

  /** How romantically/physically attracted the NPC is (0 to 100, optional) */
  attraction?: number | undefined;

  /** How afraid of the player the NPC is (0 to 100) */
  fear: number;
}

/**
 * Partial relationship scores intended for configuration/threshold objects.
 *
 * With `exactOptionalPropertyTypes`, an optional property like `fondness?: number`
 * does not allow an explicit `undefined` value when present. Zod's `.partial()`
 * models optional fields as `number | undefined`, so we represent that here.
 */
export type PartialRelationshipScores = Partial<{
  [K in keyof RelationshipScores]: RelationshipScores[K] | undefined;
}>;

/**
 * Labels for affinity score ranges.
 */
export type AffinityLabel =
  | 'hatred'
  | 'dislike'
  | 'neutral'
  | 'friendly'
  | 'adoring'
  | 'suspicious'
  | 'wary'
  | 'trusting'
  | 'implicit'
  | 'contempt'
  | 'unimpressed'
  | 'impressed'
  | 'reverent'
  | 'anxious'
  | 'uneasy'
  | 'relaxed'
  | 'intimate'
  | 'repulsed'
  | 'uninterested'
  | 'interested'
  | 'smitten'
  | 'unafraid'
  | 'nervous'
  | 'frightened'
  | 'terrified';

// =============================================================================
// Disposition (Composite Relationship)
// =============================================================================

/**
 * Overall relationship level derived from affinity scores.
 */
export type DispositionLevel =
  | 'hostile'
  | 'unfriendly'
  | 'neutral'
  | 'friendly'
  | 'close'
  | 'devoted';

/**
 * Modifier that qualifies the disposition level.
 */
export interface DispositionModifier {
  /** Source of the modifier (e.g., 'high-fear', 'trust-deficit') */
  source: string;

  /** Behavioral effect description */
  effect: string;
}

/**
 * Complete disposition state calculated from affinity.
 */
export interface Disposition {
  /** Overall relationship level */
  level: DispositionLevel;

  /** Modifiers that qualify the level */
  modifiers: DispositionModifier[];

  /** Weighted overall score (-100 to 100) */
  overallScore: number;
}

// =============================================================================
// Affinity Changes
// =============================================================================

/**
 * Which affinity dimension is affected by an action.
 */
export type AffinityDimension = keyof RelationshipScores;

/**
 * Personality-based modifier for affinity changes.
 */
export interface PersonalityAffinityModifier {
  /** Personality trait or facet name */
  trait: string;

  /** Multiplier when trait value is high (> 0.6) */
  highMultiplier: number;

  /** Multiplier when trait value is low (< 0.4) */
  lowMultiplier: number;
}

/**
 * Condition type for affinity effect modifiers.
 */
export type AffinityConditionType = 'current-affinity' | 'context' | 'frequency';

/**
 * Condition that modifies an affinity effect.
 */
export interface AffinityCondition {
  /** Type of condition */
  type: AffinityConditionType;

  /** Condition parameters */
  params: Record<string, unknown>;

  /** Effect multiplier when condition is met */
  multiplier: number;
}

/**
 * Effect that modifies an affinity dimension.
 */
export interface AffinityEffect {
  /** Which dimension is affected */
  dimension: AffinityDimension;

  /** Base change amount */
  baseChange: number;

  /** Personality-based modifiers */
  personalityModifiers?: PersonalityAffinityModifier[] | undefined;

  /** Conditions that amplify or reduce the effect */
  conditions?: AffinityCondition[] | undefined;
}

/**
 * Map of action types to their affinity effects.
 */
export type AffinityEffectsMap = Record<string, AffinityEffect[]>;

// =============================================================================
// Action History and Diminishing Returns
// =============================================================================

/**
 * History entry for tracking repeated actions.
 */
export interface ActionHistory {
  /** Type of action performed */
  actionType: string;

  /** Number of times performed */
  count: number;

  /** When the action last occurred */
  lastOccurred: GameTime;
}

/**
 * Configuration for diminishing returns on repeated actions.
 */
export interface DiminishingReturnsConfig {
  /** Decay factor per repeat (0-1, e.g., 0.7 = 70% effectiveness) */
  decayFactor: number;

  /** Minimum effect multiplier (e.g., 0.1 = never less than 10%) */
  minimumEffect: number;

  /** Hours before the effect resets to full */
  resetAfterHours: number;
}

// =============================================================================
// Unlocks and Thresholds
// =============================================================================

/**
 * Types of content that can be unlocked by affinity.
 */
export type UnlockType =
  | 'dialogue-topic'
  | 'action'
  | 'favor'
  | 'secret'
  | 'location-access'
  | 'romance-option'
  | 'special-interaction';

/**
 * Content unlocked at certain affinity thresholds.
 */
export interface AffinityUnlock {
  /** What is unlocked */
  type: UnlockType;

  /** Required minimum affinity scores */
  requirements: PartialRelationshipScores;

  /** Affinity scores that block this unlock */
  blockers?: PartialRelationshipScores | undefined;

  /** Description of what is unlocked */
  description: string;
}

/**
 * Tolerance thresholds for various player behaviors.
 */
export interface ToleranceProfile {
  /** How many insults before upset */
  insultThreshold: number;

  /** Minutes of boring topic before changing subject */
  boringTopicMinutes: number;

  /** How much flattery before suspicious */
  flatteryThreshold: number;

  /** How much prying before shutting down */
  pryingThreshold: number;

  /** How many rejections before stopping */
  rejectionThreshold: number;
}

// =============================================================================
// Affinity Decay
// =============================================================================

/**
 * Configuration for natural affinity decay over time.
 */
export interface AffinityDecayConfig {
  /** Points drift toward 0 per day */
  dailyDecayRate: number;

  /** Minimum score before decay stops */
  decayFloor: number;

  /** Maximum score before decay starts */
  decayCeiling: number;

  /** Decay multipliers by dimension */
  dimensionMultipliers?: Partial<Record<AffinityDimension, number>> | undefined;
}

// =============================================================================
// Milestones
// =============================================================================

/**
 * Significant event that creates permanent affinity shifts.
 */
export interface AffinityMilestone {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description of the event */
  description: string;

  /** Affinity changes from this milestone */
  effects: PartialRelationshipScores;

  /** If true, affinity won't decay below this milestone's effects */
  permanent: boolean;
}

// =============================================================================
// Character Instance State
// =============================================================================

/**
 * Complete affinity state for a character instance.
 */
export interface CharacterInstanceAffinity {
  /** Current affinity scores */
  scores: RelationshipScores;

  /** When affinity was last updated (ISO timestamp) */
  lastUpdated: string;

  /** Action history for diminishing returns */
  actionHistory: ActionHistory[];

  /** IDs of achieved milestones */
  milestones: string[];

  /** Cached relationship level */
  relationshipLevel: DispositionLevel;
}

// =============================================================================
// Prompt Context
// =============================================================================

/**
 * Affinity context formatted for LLM prompts.
 */
export interface AffinityContext {
  /** Current relationship level */
  relationship: DispositionLevel;

  /** Key affinity insights for prompting */
  insights: string[];

  /** Available action unlocks */
  availableActions: string[];

  /** Available dialogue topics */
  availableTopics: string[];

  /** Current tolerance levels */
  tolerance: ToleranceProfile;
}

// =============================================================================
// Calculation Input/Output
// =============================================================================

/**
 * Weights for calculating overall disposition.
 */
export interface DispositionWeights {
  fondness: number;
  trust: number;
  respect: number;
  comfort: number;
  attraction: number;
}

/**
 * Input for calculating tolerance.
 */
export interface ToleranceInput {
  affinity: RelationshipScores;
  personality?:
    | {
        dimensions?: {
          agreeableness?: number | undefined;
        };
      }
    | undefined;
}
