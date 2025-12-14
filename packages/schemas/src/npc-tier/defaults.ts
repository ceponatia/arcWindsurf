/**
 * NPC Tier System Defaults
 *
 * Default configurations for NPC tiers and interest scoring.
 */
import type { NpcTier, NpcTierConfig, InterestConfig, PlayerInterestScore } from './types.js';

// =============================================================================
// Tier Configuration Defaults
// =============================================================================

/**
 * Default configuration for each NPC tier.
 */
export const NPC_TIER_DEFAULTS: Record<NpcTier, NpcTierConfig> = {
  major: {
    tier: 'major',
    profileDepth: 'full',
    hasSchedule: true,
    persistState: true,
    promotable: false, // Already at top
    simulationPriority: 10,
  },
  minor: {
    tier: 'minor',
    profileDepth: 'partial',
    hasSchedule: true, // Simpler schedules
    persistState: true,
    promotable: true, // Can become major if player shows interest
    simulationPriority: 5,
  },
  background: {
    tier: 'background',
    profileDepth: 'minimal',
    hasSchedule: false, // Just "appears at location X"
    persistState: false, // Regenerated each session
    promotable: true,
    simulationPriority: 1,
  },
  transient: {
    tier: 'transient',
    profileDepth: 'generated',
    hasSchedule: false,
    persistState: false,
    promotable: true, // Could become background or minor
    simulationPriority: 0, // Only simulated when directly encountered
  },
};

/**
 * Default interest scoring configuration.
 */
export const DEFAULT_INTEREST_CONFIG: InterestConfig = {
  pointsPerInteraction: 3,
  meaningfulInteractionBonus: 5, // Named, asked questions, shared info
  baseBleedRate: 0.05, // 5% per turn
  minBleedRate: 0.005, // 0.5% minimum for high-investment
  promotionThresholds: {
    transientToBackground: 10, // ~3-4 interactions
    backgroundToMinor: 30, // ~10 interactions
    minorToMajor: 100, // ~30+ meaningful interactions
  },
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create initial player interest score for an NPC.
 */
export function createInitialInterestScore(npcId: string): PlayerInterestScore {
  return {
    npcId,
    score: 0,
    totalInteractions: 0,
    turnsSinceInteraction: 0,
    peakScore: 0,
  };
}

/**
 * Get tier configuration with optional overrides.
 */
export function getTierConfig(tier: NpcTier, overrides?: Partial<NpcTierConfig>): NpcTierConfig {
  return {
    ...NPC_TIER_DEFAULTS[tier],
    ...overrides,
  };
}

/**
 * Get the next tier in the promotion path, or null if at max.
 */
export function getNextTier(tier: NpcTier): NpcTier | null {
  switch (tier) {
    case 'transient':
      return 'background';
    case 'background':
      return 'minor';
    case 'minor':
      return 'major';
    case 'major':
      return null; // Already at top
  }
}

/**
 * Check if a tier can be promoted.
 */
export function canPromote(tier: NpcTier): boolean {
  return NPC_TIER_DEFAULTS[tier].promotable;
}
