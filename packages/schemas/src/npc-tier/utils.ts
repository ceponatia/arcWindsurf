/**
 * NPC Tier System Utilities
 *
 * Pure functions for interest scoring, promotion checks, and simulation priority.
 */
import type {
  NpcTier,
  PlayerInterestScore,
  InterestConfig,
  InteractionEvent,
  PromotionCheck,
  SimulationPriority,
  SimulationStrategy,
} from './types.js';
import { getRecord } from '../shared/record-helpers.js';
import { DEFAULT_INTEREST_CONFIG, NPC_TIER_DEFAULTS } from './defaults.js';

// =============================================================================
// Interest Score Calculations
// =============================================================================

/**
 * Determine if an interaction event is meaningful.
 * Meaningful interactions grant bonus interest points.
 */
export function isMeaningfulInteraction(event: Omit<InteractionEvent, 'meaningful'>): boolean {
  return (
    event.namedNpc || event.askedQuestions || event.affinityChanged || event.proximityEngagement
  );
}

/**
 * Calculate bleed rate based on investment level.
 * Higher peak scores = slower bleed (logarithmic decay).
 *
 * @example
 * - Peak 0-10: ~5.0% bleed
 * - Peak 20-30: ~3.5% bleed
 * - Peak 50-70: ~2.0% bleed
 * - Peak 100+: ~0.5% bleed
 */
export function calculateBleedRate(
  interest: PlayerInterestScore,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG
): number {
  // Bleed rate decreases logarithmically with peak score
  // Peak 0 -> baseBleedRate, Peak 100+ -> minBleedRate
  const investmentFactor = Math.min(1, Math.log10(interest.peakScore + 1) / 2);
  const bleedRange = config.baseBleedRate - config.minBleedRate;

  return config.baseBleedRate - bleedRange * investmentFactor;
}

/**
 * Update interest score after each turn.
 *
 * @param current - Current interest score state
 * @param interaction - Interaction event (null if no interaction this turn)
 * @param config - Interest configuration
 * @returns Updated interest score
 */
export function updateInterestScore(
  current: PlayerInterestScore,
  interaction: InteractionEvent | null,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG
): PlayerInterestScore {
  let newScore = current.score;
  let turnsSince = current.turnsSinceInteraction;
  let totalInteractions = current.totalInteractions;

  if (interaction) {
    // Interaction occurred - add points
    newScore += config.pointsPerInteraction;

    if (interaction.meaningful) {
      newScore += config.meaningfulInteractionBonus;
    }

    turnsSince = 0;
    totalInteractions += 1;
  } else {
    // No interaction - apply bleed
    const bleedRate = calculateBleedRate(current, config);
    newScore = Math.max(0, newScore * (1 - bleedRate));
    turnsSince += 1;
  }

  return {
    npcId: current.npcId,
    score: newScore,
    totalInteractions,
    turnsSinceInteraction: turnsSince,
    peakScore: Math.max(current.peakScore, newScore),
  };
}

/**
 * Calculate estimated turns to lose 50% of current score.
 */
export function estimateTurnsToHalfScore(
  interest: PlayerInterestScore,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG
): number {
  const bleedRate = calculateBleedRate(interest, config);
  if (bleedRate <= 0) return Infinity;

  // Using compound decay: score * (1 - rate)^turns = score * 0.5
  // (1 - rate)^turns = 0.5
  // turns * ln(1 - rate) = ln(0.5)
  // turns = ln(0.5) / ln(1 - rate)
  return Math.ceil(Math.log(0.5) / Math.log(1 - bleedRate));
}

// =============================================================================
// Promotion Logic
// =============================================================================

/**
 * Get the promotion threshold for a given tier.
 */
export function getPromotionThreshold(
  tier: NpcTier,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG
): number | null {
  switch (tier) {
    case 'transient':
      return config.promotionThresholds.transientToBackground;
    case 'background':
      return config.promotionThresholds.backgroundToMinor;
    case 'minor':
      return config.promotionThresholds.minorToMajor;
    case 'major':
      return null; // Cannot be promoted further
  }
}

/**
 * Check if an NPC should be promoted based on interest score.
 */
export function checkPromotion(
  npcId: string,
  tier: NpcTier,
  interest: PlayerInterestScore,
  config: InterestConfig = DEFAULT_INTEREST_CONFIG
): PromotionCheck {
  const threshold = getPromotionThreshold(tier, config);
  const shouldPromote = threshold !== null && interest.score >= threshold;

  let targetTier: NpcTier | undefined;
  if (shouldPromote) {
    switch (tier) {
      case 'transient':
        targetTier = 'background';
        break;
      case 'background':
        targetTier = 'minor';
        break;
      case 'minor':
        targetTier = 'major';
        break;
    }
  }

  return {
    npcId,
    currentTier: tier,
    currentScore: interest.score,
    shouldPromote,
    targetTier,
    thresholdMet: shouldPromote ? (threshold ?? undefined) : undefined,
  };
}

/**
 * Get the fields that need to be generated when promoting to a tier.
 */
export function getFieldsToGenerate(targetTier: NpcTier): string[] {
  switch (targetTier) {
    case 'background':
      // Persist name and appearance
      return ['name', 'appearanceSnippet'];
    case 'minor':
      // Generate personality traits, simple schedule, backstory
      return ['personalityTraits', 'backstory', 'scheduleTemplate', 'speechPatterns'];
    case 'major':
      // Generate full personality, detailed schedule, relationships
      return [
        'personalityMap',
        'detailedBackstory',
        'detailedSchedule',
        'relationships',
        'goals',
        'fears',
        'values',
      ];
    default:
      return [];
  }
}

// =============================================================================
// Simulation Priority
// =============================================================================

/**
 * Get minimum simulation priority for a tier.
 * Priority can decay but never below this minimum.
 */
export function getTierMinimumPriority(tier: NpcTier): number {
  switch (tier) {
    case 'major':
      return 3; // Major NPCs never go below 3
    case 'minor':
      return 1; // Minor NPCs never go below 1
    case 'background':
    case 'transient':
      return 0; // Can go to zero
  }
}

/**
 * Adjust simulation priority based on how recently the player interacted.
 *
 * @param priority - Current simulation priority state
 * @param currentTurn - Current turn number
 * @param tier - NPC's tier (for minimum priority)
 * @returns Adjusted priority value
 */
export function adjustSimulationPriority(
  priority: SimulationPriority,
  currentTurn: number,
  tier: NpcTier
): number {
  const turnsSince = currentTurn - priority.lastInteractionTurn;

  // Priority decays over time but never below tier minimum
  // Decay factor: 1 at turn 0, approaches 0.1 at turn 1000+
  const decayFactor = Math.max(0.1, 1 - turnsSince / 1000);
  const tierMinimum = getTierMinimumPriority(tier);

  return Math.max(tierMinimum, priority.basePriority * decayFactor);
}

/**
 * Determine simulation strategy based on priority level.
 *
 * | Priority | Strategy   | Update Frequency           |
 * |----------|------------|---------------------------|
 * | 8-10     | Eager      | Every turn                |
 * | 5-7      | Active     | Every period change       |
 * | 2-4      | Lazy       | On location change        |
 * | 0-1      | On-Demand  | Only when directly queried|
 */
export function getSimulationStrategy(priority: number): SimulationStrategy {
  if (priority >= 8) return 'eager';
  if (priority >= 5) return 'active';
  if (priority >= 2) return 'lazy';
  return 'on-demand';
}

/**
 * Create initial simulation priority for an NPC.
 */
export function createSimulationPriority(
  npcId: string,
  tier: NpcTier,
  currentTurn: number
): SimulationPriority {
  const basePriority = getRecord(NPC_TIER_DEFAULTS, tier).simulationPriority;

  return {
    npcId,
    basePriority,
    currentPriority: basePriority,
    lastInteractionTurn: currentTurn,
  };
}

/**
 * Update simulation priority after an interaction.
 */
export function updateSimulationPriorityOnInteraction(
  priority: SimulationPriority,
  currentTurn: number
): SimulationPriority {
  return {
    ...priority,
    currentPriority: priority.basePriority, // Reset to base on interaction
    lastInteractionTurn: currentTurn,
  };
}
