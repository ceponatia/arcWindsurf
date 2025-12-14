/**
 * Hygiene state schemas for tracking NPC cleanliness over time.
 *
 * The hygiene system models gradual decay of cleanliness through accumulated
 * "decay points" that translate to hygiene levels 0-4:
 * - Level 0: Clean (fresh, no noticeable scent)
 * - Level 1: Mild (faint hints, only noticeable up close)
 * - Level 2: Moderate (noticeable in normal conversation distance)
 * - Level 3: Strong (obvious, potentially distracting)
 * - Level 4: Extreme (overpowering, affects social interactions)
 *
 * Decay points accumulate based on:
 * - Base decay rate per turn (varies by body part)
 * - Activity multiplier (idle, walking, running, labor, combat)
 * - Clothing/footwear multiplier (barefoot vs sealed boots)
 * - Environment factors (humid, rain, swimming)
 */

import { z } from 'zod';
import { BODY_REGIONS } from '../character/regions.js';

/**
 * Hygiene levels from clean (0) to extreme (4).
 */
export const HYGIENE_LEVELS = [0, 1, 2, 3, 4] as const;
export type HygieneLevel = (typeof HYGIENE_LEVELS)[number];

/**
 * Activity types that affect decay rate.
 */
export const ACTIVITY_TYPES = ['idle', 'walking', 'running', 'labor', 'combat'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * Activity multipliers for decay calculation.
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityType, number> = {
  idle: 0.5,
  walking: 1.0,
  running: 2.0,
  labor: 2.5,
  combat: 3.0,
};

/**
 * Footwear types that affect feet decay.
 */
export const FOOTWEAR_TYPES = [
  'barefoot',
  'sandals',
  'shoes_with_socks',
  'shoes_no_socks',
  'boots_heavy',
  'boots_sealed',
] as const;
export type FootwearType = (typeof FOOTWEAR_TYPES)[number];

/**
 * Footwear multipliers for feet decay calculation.
 */
export const FOOTWEAR_MULTIPLIERS: Record<FootwearType, number> = {
  barefoot: 0.3,
  sandals: 0.5,
  shoes_with_socks: 1.0,
  shoes_no_socks: 1.8,
  boots_heavy: 1.5,
  boots_sealed: 2.0,
};

/**
 * Environment types that affect decay rate.
 */
export const ENVIRONMENT_TYPES = ['dry', 'humid', 'rain', 'swimming'] as const;
export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[number];

/**
 * Environment multipliers for decay calculation.
 */
export const ENVIRONMENT_MULTIPLIERS: Record<EnvironmentType, number> = {
  dry: 0.8,
  humid: 1.5,
  rain: 0.3, // Rain washes away some buildup
  swimming: 0.0, // Swimming resets decay (cleaning effect)
};

/**
 * Sense types for sensory modifiers.
 */
export const SENSORY_TYPES = ['smell', 'touch', 'taste'] as const;
export type SensoryType = (typeof SENSORY_TYPES)[number];

/**
 * Schema for a single body part's hygiene state.
 */
export const BodyPartHygieneStateSchema = z.object({
  /** Accumulated decay points */
  points: z.number().min(0).default(0),
  /** Computed hygiene level (0-4) */
  level: z.number().min(0).max(4).default(0),
  /** ISO timestamp of last update */
  lastUpdatedAt: z.string().datetime().optional(),
});

export type BodyPartHygieneState = z.infer<typeof BodyPartHygieneStateSchema>;

/**
 * Schema for an NPC's complete hygiene state.
 * Maps body regions to their hygiene state.
 */
export const NpcHygieneStateSchema = z.object({
  /** NPC this hygiene state belongs to */
  npcId: z.string(),
  /** Hygiene state per body region */
  bodyParts: z.record(z.string(), BodyPartHygieneStateSchema).default({}),
  /** Last turn number when hygiene was updated */
  lastTurnNumber: z.number().optional(),
});

export type NpcHygieneState = z.infer<typeof NpcHygieneStateSchema>;

/**
 * Schema for hygiene configuration for a specific body part.
 * Defines thresholds and base decay rate.
 */
export const BodyPartHygieneConfigSchema = z.object({
  /** Body part this config applies to */
  bodyPart: z.string(),
  /** Point thresholds for levels 1, 2, 3, 4 */
  thresholds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  /** Base decay points per turn */
  baseDecayPerTurn: z.number().min(0),
});

export type BodyPartHygieneConfig = z.infer<typeof BodyPartHygieneConfigSchema>;

/**
 * Schema for hygiene update input.
 */
export const HygieneUpdateInputSchema = z.object({
  /** NPC to update */
  npcId: z.string(),
  /** Number of turns elapsed */
  turnsElapsed: z.number().min(0).default(1),
  /** Activity during the turn(s) */
  activity: z.enum(ACTIVITY_TYPES).default('idle'),
  /** Current footwear */
  footwear: z.enum(FOOTWEAR_TYPES).optional(),
  /** Current environment */
  environment: z.enum(ENVIRONMENT_TYPES).optional(),
  /** Whether a cleaning action occurred (resets specific body parts) */
  cleanedParts: z.array(z.string()).optional(),
});

export type HygieneUpdateInput = z.infer<typeof HygieneUpdateInputSchema>;

/**
 * Schema for sensory modifier text at each hygiene level.
 * Keys are stringified numbers since JSON objects have string keys.
 */
export const SensoryModifierLevelsSchema = z.object({
  /** Clean - no modifier */
  '0': z.string().default(''),
  /** Mild modifier */
  '1': z.string(),
  /** Moderate modifier */
  '2': z.string(),
  /** Strong modifier */
  '3': z.string(),
  /** Extreme modifier */
  '4': z.string(),
});

export type SensoryModifierLevels = z.infer<typeof SensoryModifierLevelsSchema>;

/**
 * Helper to get sensory modifier by numeric level.
 */
export function getSensoryModifierByLevel(
  modifiers: SensoryModifierLevels | undefined,
  level: HygieneLevel
): string {
  if (!modifiers) return '';
  return modifiers[level.toString() as keyof SensoryModifierLevels] ?? '';
}

/**
 * Schema for sensory modifiers for a body part.
 */
export const BodyPartSensoryModifiersSchema = z.object({
  smell: SensoryModifierLevelsSchema.optional(),
  touch: SensoryModifierLevelsSchema.optional(),
  taste: SensoryModifierLevelsSchema.optional(),
});

export type BodyPartSensoryModifiers = z.infer<typeof BodyPartSensoryModifiersSchema>;

/**
 * Schema for the complete sensory modifiers data file.
 */
export const SensoryModifiersDataSchema = z.object({
  /** Sensory modifiers per body part */
  bodyParts: z.record(z.string(), BodyPartSensoryModifiersSchema),
  /** Decay rate configuration per body part */
  decayRates: z.record(z.string(), BodyPartHygieneConfigSchema),
});

export type SensoryModifiersData = z.infer<typeof SensoryModifiersDataSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate hygiene level from decay points using thresholds.
 */
export function calculateHygieneLevel(
  points: number,
  thresholds: [number, number, number, number]
): HygieneLevel {
  if (points >= thresholds[3]) return 4;
  if (points >= thresholds[2]) return 3;
  if (points >= thresholds[1]) return 2;
  if (points >= thresholds[0]) return 1;
  return 0;
}

/**
 * Calculate decay points to add based on activity, footwear, and environment.
 */
export function calculateDecayPoints(
  baseDecay: number,
  turnsElapsed: number,
  activity: ActivityType,
  footwear?: FootwearType,
  environment?: EnvironmentType,
  isFootPart = false
): number {
  let multiplier = ACTIVITY_MULTIPLIERS[activity];

  // Apply footwear multiplier only for feet-related parts
  if (isFootPart && footwear) {
    multiplier *= FOOTWEAR_MULTIPLIERS[footwear];
  }

  // Apply environment multiplier
  if (environment) {
    multiplier *= ENVIRONMENT_MULTIPLIERS[environment];
  }

  return baseDecay * turnsElapsed * multiplier;
}

/**
 * Create initial clean hygiene state for an NPC.
 */
export function createInitialHygieneState(npcId: string): NpcHygieneState {
  const bodyParts: Record<string, BodyPartHygieneState> = {};

  // Initialize all body regions to clean (0 points, level 0)
  for (const region of BODY_REGIONS) {
    bodyParts[region] = {
      points: 0,
      level: 0,
    };
  }

  return {
    npcId,
    bodyParts,
  };
}

/**
 * Check if a body part is foot-related (for footwear modifier).
 */
export function isFootRelatedPart(bodyPart: string): boolean {
  return bodyPart === 'feet';
}

/**
 * Reset hygiene for specific body parts (cleaning action).
 */
export function resetBodyPartHygiene(
  state: NpcHygieneState,
  bodyParts: string[]
): NpcHygieneState {
  const newBodyParts = { ...state.bodyParts };

  for (const part of bodyParts) {
    if (newBodyParts[part]) {
      newBodyParts[part] = {
        points: 0,
        level: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    ...state,
    bodyParts: newBodyParts,
  };
}

/**
 * Get base sensory description for an NPC body part.
 * This is used in combination with hygiene modifiers.
 *
 * @param baseDescription - The character's base sensory description for this part
 * @param modifier - Hygiene-based modifier text to append
 * @returns Combined description with hygiene modifier
 */
export function combineSensoryWithHygiene(
  baseDescription: string,
  modifier: string
): string {
  if (!modifier || modifier.trim() === '') {
    return baseDescription;
  }
  return `${baseDescription.trim()} ${modifier.trim()}`.trim();
}

/**
 * Update hygiene state for all body parts based on activity.
 *
 * @param state - Current hygiene state
 * @param decayRates - Decay rate configuration for each body part
 * @param input - Update input parameters
 * @returns Updated hygiene state
 */
export function applyHygieneDecay(
  state: NpcHygieneState,
  decayRates: Record<string, BodyPartHygieneConfig>,
  input: HygieneUpdateInput
): NpcHygieneState {
  const newBodyParts = { ...state.bodyParts };
  const now = new Date().toISOString();

  // Handle cleaning first
  if (input.cleanedParts && input.cleanedParts.length > 0) {
    for (const part of input.cleanedParts) {
      if (newBodyParts[part]) {
        newBodyParts[part] = {
          points: 0,
          level: 0,
          lastUpdatedAt: now,
        };
      }
    }
  }

  // Apply decay to each body part
  for (const [bodyPart, config] of Object.entries(decayRates)) {
    // Skip if cleaned
    if (input.cleanedParts?.includes(bodyPart)) {
      continue;
    }

    const currentPart = newBodyParts[bodyPart] ?? { points: 0, level: 0 };

    const decayPoints = calculateDecayPoints(
      config.baseDecayPerTurn,
      input.turnsElapsed,
      input.activity,
      input.footwear,
      input.environment,
      isFootRelatedPart(bodyPart)
    );

    const newPoints = currentPart.points + decayPoints;
    const newLevel = calculateHygieneLevel(newPoints, config.thresholds);

    newBodyParts[bodyPart] = {
      points: newPoints,
      level: newLevel,
      lastUpdatedAt: now,
    };
  }

  return {
    ...state,
    bodyParts: newBodyParts,
  };
}
