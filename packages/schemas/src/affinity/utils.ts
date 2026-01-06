/**
 * Affinity Utility Functions
 *
 * Pure functions for affinity calculation, disposition, decay, and unlocks.
 *
 * @see dev-docs/28-affinity-and-relationship-dynamics.md
 */
import { getRecord, setRecord } from '@minimal-rpg/utils';
import type {
  RelationshipScores,
  Disposition,
  DispositionLevel,
  DispositionModifier,
  AffinityEffect,
  ActionHistory,
  DiminishingReturnsConfig,
  AffinityDecayConfig,
  AffinityUnlock,
  ToleranceProfile,
  AffinityContext,
  DispositionWeights,
  ToleranceInput,
  AffinityLabel,
  AffinityDimension,
  CharacterInstanceAffinity,
} from './types.js';
import {
  DEFAULT_AFFINITY_SCORES,
  DEFAULT_DISPOSITION_WEIGHTS,
  DEFAULT_DIMINISHING_RETURNS_CONFIG,
  DEFAULT_AFFINITY_DECAY_CONFIG,
  STANDARD_UNLOCKS,
  BASE_TOLERANCE,
  AFFINITY_THRESHOLDS,
  DISPOSITION_THRESHOLDS,
} from './defaults.js';

// =============================================================================
// Disposition Calculation
// =============================================================================

/**
 * Calculate overall disposition from affinity scores.
 *
 * @param affinity - Current affinity scores
 * @param weights - Optional custom weights
 * @returns Complete disposition with level and modifiers
 */
export function calculateDisposition(
  affinity: RelationshipScores,
  weights: DispositionWeights = DEFAULT_DISPOSITION_WEIGHTS
): Disposition {
  // Calculate weighted average
  let weightedSum = 0;
  let totalWeight = 0;

  // Process each dimension
  const dimensions: { key: keyof DispositionWeights; score: number | undefined }[] = [
    { key: 'fondness', score: affinity.fondness },
    { key: 'trust', score: affinity.trust },
    { key: 'respect', score: affinity.respect },
    { key: 'comfort', score: affinity.comfort },
    { key: 'attraction', score: affinity.attraction },
  ];

  for (const { key, score } of dimensions) {
    if (score !== undefined) {
      weightedSum += score * getRecord(weights, key);
      totalWeight += getRecord(weights, key);
    }
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Determine level from score
  let level: DispositionLevel;
  if (overallScore < DISPOSITION_THRESHOLDS.hostile) level = 'hostile';
  else if (overallScore < DISPOSITION_THRESHOLDS.unfriendly) level = 'unfriendly';
  else if (overallScore < DISPOSITION_THRESHOLDS.neutral) level = 'neutral';
  else if (overallScore < DISPOSITION_THRESHOLDS.friendly) level = 'friendly';
  else if (overallScore < DISPOSITION_THRESHOLDS.close) level = 'close';
  else level = 'devoted';

  // Build modifiers
  const modifiers: DispositionModifier[] = [];

  // High fear overrides positive disposition
  if (affinity.fear > 60) {
    modifiers.push({
      source: 'high-fear',
      effect: 'compliant but not genuine',
    });
  }

  // Low trust with high fondness
  if (affinity.trust < -20 && affinity.fondness > 20) {
    modifiers.push({
      source: 'trust-deficit',
      effect: 'likes player but remains guarded',
    });
  }

  // High attraction with low fondness
  if (affinity.attraction > 40 && affinity.fondness < 20) {
    modifiers.push({
      source: 'conflicted-attraction',
      effect: 'attracted but emotionally distant',
    });
  }

  // High respect with low fondness
  if (affinity.respect > 40 && affinity.fondness < 0) {
    modifiers.push({
      source: 'grudging-respect',
      effect: 'respects abilities but dislikes personally',
    });
  }

  // Low comfort with high fondness
  if (affinity.comfort < -20 && affinity.fondness > 40) {
    modifiers.push({
      source: 'nervous-fondness',
      effect: 'cares deeply but feels anxious around player',
    });
  }

  return { level, modifiers, overallScore };
}

// =============================================================================
// Affinity Labels
// =============================================================================

/**
 * Get a descriptive label for a specific affinity dimension value.
 *
 * @param dimension - Which affinity dimension
 * @param value - The score value
 * @returns Human-readable label
 */
export function getAffinityLabel(dimension: AffinityDimension, value: number): AffinityLabel {
  const thresholds = getRecord(AFFINITY_THRESHOLDS, dimension);
  if (!thresholds) return 'neutral';

  for (const [label, [min, max]] of Object.entries(thresholds)) {
    if (value >= min && value <= max) {
      return label as AffinityLabel;
    }
  }

  return 'neutral';
}

/**
 * Get labels for all affinity dimensions.
 *
 * @param affinity - Current affinity scores
 * @returns Object mapping dimensions to their labels
 */
export function getAllAffinityLabels(
  affinity: RelationshipScores
): Record<AffinityDimension, AffinityLabel> {
  return {
    fondness: getAffinityLabel('fondness', affinity.fondness),
    trust: getAffinityLabel('trust', affinity.trust),
    respect: getAffinityLabel('respect', affinity.respect),
    comfort: getAffinityLabel('comfort', affinity.comfort),
    attraction: getAffinityLabel('attraction', affinity.attraction),
    fear: getAffinityLabel('fear', affinity.fear),
  };
}

// =============================================================================
// Affinity Modification
// =============================================================================

/**
 * Apply an affinity effect to scores.
 *
 * @param affinity - Current affinity scores
 * @param effect - Effect to apply
 * @param personalityValue - Optional personality trait value (0-1)
 * @returns New affinity scores
 */
export function applyAffinityEffect(
  affinity: RelationshipScores,
  effect: AffinityEffect,
  personalityValue?: number
): RelationshipScores {
  let change = effect.baseChange;

  // Apply personality modifiers
  if (effect.personalityModifiers && personalityValue !== undefined) {
    for (const mod of effect.personalityModifiers) {
      if (personalityValue > 0.6) {
        change *= mod.highMultiplier;
      } else if (personalityValue < 0.4) {
        change *= mod.lowMultiplier;
      }
    }
  }

  change = Math.round(change);

  // Apply to dimension
  const result = { ...affinity };
  const currentValue = getRecord(result, effect.dimension);

  if (effect.dimension === 'fear') {
    // Fear is 0-100
    result.fear = clamp((currentValue ?? 0) + change, 0, 100);
  } else if (effect.dimension === 'attraction') {
    // Attraction is 0-100
    result.attraction = clamp(result.attraction + change, 0, 100);
  } else {
    // Other dimensions are -100 to 100
    const key = effect.dimension;
    setRecord(result, key, clamp(getRecord(result, key) + change, -100, 100));
  }

  return result;
}

/**
 * Apply multiple effects at once.
 *
 * @param affinity - Current affinity scores
 * @param effects - Effects to apply
 * @returns New affinity scores
 */
export function applyAffinityEffects(
  affinity: RelationshipScores,
  effects: AffinityEffect[]
): RelationshipScores {
  let result = { ...affinity };
  for (const effect of effects) {
    result = applyAffinityEffect(result, effect);
  }
  return result;
}

// =============================================================================
// Diminishing Returns
// =============================================================================

/**
 * Calculate diminishing returns for repeated actions.
 *
 * @param baseChange - Original change amount
 * @param history - Action history entry
 * @param hoursSinceFirst - Hours since first occurrence
 * @param config - Diminishing returns config
 * @returns Adjusted change amount
 */
export function calculateDiminishingReturns(
  baseChange: number,
  history: ActionHistory,
  hoursSinceFirst: number,
  config: DiminishingReturnsConfig = DEFAULT_DIMINISHING_RETURNS_CONFIG
): number {
  // Reset if enough time has passed
  if (hoursSinceFirst > config.resetAfterHours) {
    return baseChange;
  }

  // Apply exponential decay based on count
  const multiplier = Math.max(
    config.minimumEffect,
    Math.pow(config.decayFactor, history.count - 1)
  );

  return Math.round(baseChange * multiplier);
}

// =============================================================================
// Tolerance Calculation
// =============================================================================

/**
 * Calculate tolerance based on affinity and personality.
 *
 * @param input - Affinity and personality data
 * @returns Tolerance profile
 */
export function calculateTolerance(input: ToleranceInput): ToleranceProfile {
  const { affinity, personality } = input;

  // Higher fondness = more tolerance
  const fondnessMultiplier = 1 + affinity.fondness / 100;

  // Higher trust = more tolerance for prying
  const trustMultiplier = 1 + affinity.trust / 100;

  // Personality modifiers
  const agreeableness = personality?.dimensions?.agreeableness ?? 0.5;
  const patienceMultiplier = agreeableness + 0.5;

  return {
    insultThreshold: Math.max(
      1,
      Math.floor(BASE_TOLERANCE.insultThreshold * fondnessMultiplier * patienceMultiplier)
    ),
    boringTopicMinutes: Math.floor(BASE_TOLERANCE.boringTopicMinutes * fondnessMultiplier),
    flatteryThreshold: Math.floor(BASE_TOLERANCE.flatteryThreshold * (2 - trustMultiplier)),
    pryingThreshold: Math.floor(BASE_TOLERANCE.pryingThreshold * trustMultiplier),
    rejectionThreshold: Math.floor(BASE_TOLERANCE.rejectionThreshold * fondnessMultiplier),
  };
}

// =============================================================================
// Affinity Decay
// =============================================================================

/**
 * Apply natural decay to affinity scores over time.
 *
 * @param affinity - Current affinity scores
 * @param daysSinceLastInteraction - Days since last interaction
 * @param config - Decay configuration
 * @returns Decayed affinity scores
 */
export function applyAffinityDecay(
  affinity: RelationshipScores,
  daysSinceLastInteraction: number,
  config: AffinityDecayConfig = DEFAULT_AFFINITY_DECAY_CONFIG
): RelationshipScores {
  const result = { ...affinity };

  // Process each dimension
  const dimensions: AffinityDimension[] = [
    'fondness',
    'trust',
    'respect',
    'comfort',
    'attraction',
    'fear',
  ];

  for (const dimension of dimensions) {
    // Not a Record: RelationshipScores has optional 'attraction' field
    // eslint-disable-next-line security/detect-object-injection
    const value = result[dimension];
    if (value === undefined) continue;

    // Not a Record: dimensionMultipliers is Partial<Record>
    // eslint-disable-next-line security/detect-object-injection
    const multiplier = config.dimensionMultipliers?.[dimension] ?? 1;
    const decay = config.dailyDecayRate * multiplier * daysSinceLastInteraction;

    if (dimension === 'fear') {
      // Fear decays toward 0
      if (value > 0) {
        result.fear = Math.max(0, value - decay);
      }
    } else if (dimension === 'attraction') {
      // Attraction decays toward 0 if present
      if (result.attraction !== undefined && result.attraction > 0) {
        result.attraction = Math.max(0, result.attraction - decay);
      }
    } else {
      // Other dimensions decay toward neutral zone
      if (value > config.decayCeiling) {
        const key = dimension;
        // Not a Record: RelationshipScores has optional 'attraction' field
        // eslint-disable-next-line security/detect-object-injection
        result[key] = Math.max(config.decayCeiling, value - decay);
      } else if (value < config.decayFloor) {
        const key = dimension;
        // Not a Record: RelationshipScores has optional 'attraction' field
        // eslint-disable-next-line security/detect-object-injection
        result[key] = Math.min(config.decayFloor, value + decay);
      }
    }
  }

  return result;
}

// =============================================================================
// Unlocks
// =============================================================================

/**
 * Check if requirements are met for an unlock.
 *
 * @param affinity - Current affinity scores
 * @param unlock - Unlock to check
 * @returns Whether the unlock is available
 */
export function isUnlockAvailable(affinity: RelationshipScores, unlock: AffinityUnlock): boolean {
  // Check requirements
  for (const [key, required] of Object.entries(unlock.requirements)) {
    if (required === undefined) continue;
    const current = affinity[key as AffinityDimension];
    if (current === undefined || current < required) {
      return false;
    }
  }

  // Check blockers
  if (unlock.blockers) {
    for (const [key, blocker] of Object.entries(unlock.blockers)) {
      if (blocker === undefined) continue;
      const current = affinity[key as AffinityDimension];
      if (current !== undefined && current >= blocker) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get all available unlocks for current affinity.
 *
 * @param affinity - Current affinity scores
 * @param unlocks - Available unlocks (defaults to standard)
 * @returns List of available unlocks
 */
export function getAvailableUnlocks(
  affinity: RelationshipScores,
  unlocks: AffinityUnlock[] = STANDARD_UNLOCKS
): AffinityUnlock[] {
  return unlocks.filter((unlock) => isUnlockAvailable(affinity, unlock));
}

// =============================================================================
// Prompt Context
// =============================================================================

/**
 * Build affinity context for LLM prompts.
 *
 * @param affinity - Current affinity scores
 * @param personality - Optional personality for tolerance calculation
 * @returns Formatted affinity context
 */
export function buildAffinityContext(
  affinity: RelationshipScores,
  personality?: ToleranceInput['personality']
): AffinityContext {
  const disposition = calculateDisposition(affinity);
  const tolerance = calculateTolerance({ affinity, personality });
  const unlocks = getAvailableUnlocks(affinity);

  const insights: string[] = [];

  // Generate human-readable insights
  if (affinity.fondness > 50) {
    insights.push("Genuinely enjoys the player's company");
  } else if (affinity.fondness > 20) {
    insights.push('Likes the player');
  } else if (affinity.fondness < -30) {
    insights.push('Dislikes the player');
  } else if (affinity.fondness < -60) {
    insights.push('Actively despises the player');
  }

  if (affinity.trust > 40) {
    insights.push('Trusts the player with sensitive information');
  } else if (affinity.trust < -20) {
    insights.push("Suspicious of the player's motives");
  } else if (affinity.trust < -50) {
    insights.push('Deeply distrusts the player');
  }

  if (affinity.respect > 40) {
    insights.push("Admires the player's abilities");
  } else if (affinity.respect < -30) {
    insights.push('Looks down on the player');
  }

  if (affinity.comfort > 40) {
    insights.push('Feels relaxed and at ease around the player');
  } else if (affinity.comfort < -30) {
    insights.push('Feels tense and guarded around the player');
  }

  if (affinity.attraction > 40) {
    insights.push('Attracted to the player');
  }

  if (affinity.fear > 40) {
    insights.push('Afraid of the player, will be compliant but resentful');
  } else if (affinity.fear > 60) {
    insights.push('Terrified of the player');
  }

  // Add modifier insights
  for (const mod of disposition.modifiers) {
    insights.push(mod.effect);
  }

  return {
    relationship: disposition.level,
    insights,
    availableActions: unlocks.filter((u) => u.type === 'action').map((u) => u.description),
    availableTopics: unlocks.filter((u) => u.type === 'dialogue-topic').map((u) => u.description),
    tolerance,
  };
}

/**
 * Format affinity context as a prompt string.
 *
 * @param context - Affinity context
 * @returns Formatted string for prompt injection
 */
export function formatAffinityPrompt(context: AffinityContext): string {
  const lines: string[] = [
    'RELATIONSHIP WITH PLAYER:',
    `Level: ${capitalizeFirst(context.relationship)}`,
  ];

  if (context.insights.length > 0) {
    lines.push('Insights:');
    for (const insight of context.insights) {
      lines.push(`- ${insight}`);
    }
  }

  if (context.availableTopics.length > 0) {
    lines.push('Will discuss:');
    for (const topic of context.availableTopics) {
      lines.push(`- ${topic}`);
    }
  }

  if (context.availableActions.length > 0) {
    lines.push('Willing to:');
    for (const action of context.availableActions) {
      lines.push(`- ${action}`);
    }
  }

  lines.push('Tolerance:');
  lines.push(`- Will tolerate up to ${context.tolerance.insultThreshold} insults before upset`);
  lines.push(
    `- Will listen to same topic for ~${context.tolerance.boringTopicMinutes} minutes before changing subject`
  );

  return lines.join('\n');
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create default affinity scores.
 *
 * @param _includeAttraction - Deprecated parameter (attraction is now always included)
 * @returns Default affinity scores
 * @deprecated Use DEFAULT_AFFINITY_SCORES directly (attraction is now always present)
 */
export function createDefaultRelationshipScores(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _includeAttraction = false
): RelationshipScores {
  return {
    ...DEFAULT_AFFINITY_SCORES,
  };
}

/**
 * Create a new character instance affinity state.
 *
 * @param includeAttraction - Whether to include attraction
 * @returns New character instance affinity
 */
export function createCharacterInstanceAffinity(
  includeAttraction = false
): CharacterInstanceAffinity {
  return {
    scores: createDefaultRelationshipScores(includeAttraction),
    lastUpdated: new Date().toISOString(),
    actionHistory: [],
    milestones: [],
    relationshipLevel: 'neutral',
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Capitalize the first letter of a string.
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
