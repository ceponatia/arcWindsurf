/**
 * Faction relationship value.
 * Negative = hostile, 0 = neutral, positive = friendly.
 * Range: -100 to 100
 */
export type FactionRelationship = number;

/**
 * Reputation level thresholds.
 */
export const REPUTATION_LEVELS = {
  hated: -80,
  unfriendly: -40,
  neutral: 0,
  friendly: 40,
  honored: 80,
} as const;

export type ReputationLevel = keyof typeof REPUTATION_LEVELS;
