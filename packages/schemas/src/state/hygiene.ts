/**
 * Hygiene state schemas for tracking NPC cleanliness over time.
 *
 * The hygiene system models gradual decay of cleanliness through accumulated
 * "decay points" that translate to hygiene levels 0-6:
 * - Level 0: Clean (fresh, no noticeable scent)
 * - Level 1: Mild (faint hints, only noticeable up close)
 * - Level 2: Moderate (noticeable in normal conversation distance)
 * - Level 3: Strong (obvious, potentially distracting)
 * - Level 4: Extreme (overpowering, affects social interactions)
 * - Level 5: Filthy (unmistakable, unpleasant at a distance)
 * - Level 6: Putrid (overwhelming, dominating the scene)
 *
 * Decay points accumulate based on:
 * - Base decay rate per turn (varies by body part)
 * - Activity multiplier (idle, walking, running, labor, combat)
 * - Clothing/footwear multiplier (barefoot vs sealed boots)
 * - Environment factors (humid, rain, swimming)
 */

import { z } from 'zod';
import { getRecord, getTuple, setRecord, getRecordOptional } from '../shared/record-helpers.js';
import { BODY_REGIONS } from '../character/regions.js';

/**
 * Hygiene levels from clean (0) to putrid (6).
 */
export const HYGIENE_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;
export type HygieneLevel = (typeof HYGIENE_LEVELS)[number];

/**
 * Human-readable hygiene level names.
 */
export const HYGIENE_LEVEL_NAMES: Record<HygieneLevel, string> = {
  0: 'pristine',
  1: 'fresh',
  2: 'normal',
  3: 'stale',
  4: 'dirty',
  5: 'filthy',
  6: 'putrid',
};

/**
 * Non-linear decay multipliers by current hygiene level.
 *
 * Intuition: freshness fades quickly, but reaching/remaining truly filthy is slower;
 * the maximum level stops accumulating further decay.
 */
export const HYGIENE_DECAY_MULTIPLIERS: Record<HygieneLevel, number> = {
  0: 1.0,
  1: 0.67,
  2: 0.5,
  3: 0.4,
  4: 0.33,
  5: 0.25,
  6: 0.0,
};

/**
 * Activity types that affect decay rate.
 */
export const ACTIVITY_TYPES = [
  'resting',
  'idle',
  'walking',
  'running',
  'working',
  'labor',
  'combat',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * Activity multipliers for decay calculation.
 */
export const ACTIVITY_MULTIPLIERS: Record<ActivityType, number> = {
  resting: 0.25,
  idle: 0.5,
  walking: 1.0,
  running: 2.0,
  working: 1.5,
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
export const HYGIENE_SENSE_TYPES = ['smell', 'touch', 'taste'] as const;
export type HygieneSenseType = (typeof HYGIENE_SENSE_TYPES)[number];

/**
 * Schema for a single body part's hygiene state.
 */
export const BodyPartHygieneStateSchema = z.object({
  /** Accumulated decay points */
  points: z.number().min(0).default(0),
  /** Computed hygiene level (0-6) */
  level: z.number().min(0).max(6).default(0),
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
  /** Point thresholds (legacy supported) for levels 1-6 */
  thresholds: z
    .union([
      z.tuple([z.number(), z.number(), z.number(), z.number()]),
      z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
      z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
      z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
    ])
    .transform((thresholds): HygieneThresholds => normalizeHygieneThresholds(thresholds)),
  /** Base decay points per turn */
  baseDecayPerTurn: z.number().min(0),
});

export type BodyPartHygieneConfig = z.infer<typeof BodyPartHygieneConfigSchema>;

/**
 * Raw hygiene row as stored in persistence (e.g., DB layer).
 */
export interface NpcHygieneRow {
  bodyPart: string;
  points: number;
  level: number;
  lastUpdatedAt?: Date | null;
}

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
  /** Filthy modifier (optional for backward compatibility) */
  '5': z.string().optional().default(''),
  /** Putrid modifier (optional for backward compatibility) */
  '6': z.string().optional().default(''),
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
 * Threshold tuple for the 7-level hygiene system.
 *
 * This is the minimum points for each hygiene level 0-6.
 * - thresholds[0] must be 0
 * - thresholds[1]..thresholds[6] are the boundaries for levels 1..6
 */
export type HygieneThresholds = readonly [number, number, number, number, number, number, number];

/**
 * Default thresholds for the 7-level hygiene system.
 *
 * These values are used when legacy configurations provide fewer than 6 thresholds.
 */
export const DEFAULT_HYGIENE_THRESHOLDS: HygieneThresholds = [0, 10, 25, 50, 100, 200, 400];

/**
 * Normalize legacy threshold arrays (length 4 or 5) into the 7-level tuple (length 6).
 *
 * - 4 thresholds (levels 1-4) are extended using DEFAULT_HYGIENE_THRESHOLDS for 5-6
 * - 5 thresholds (levels 1-5) are extended using DEFAULT_HYGIENE_THRESHOLDS for level 6
 */
export type HygieneThresholdsLegacy =
  | readonly [number, number, number, number]
  | readonly [number, number, number, number, number]
  | readonly [number, number, number, number, number, number]
  | HygieneThresholds;

export function normalizeHygieneThresholds(
  thresholds: HygieneThresholdsLegacy | readonly number[]
): HygieneThresholds {
  if (thresholds.length === 7) {
    return thresholds as HygieneThresholds;
  }

  if (thresholds.length === 6) {
    const t = thresholds as readonly [number, number, number, number, number, number];
    return [0, t[0], t[1], t[2], t[3], t[4], t[5]];
  }

  if (thresholds.length === 5) {
    const t = thresholds as readonly [number, number, number, number, number];
    return [0, t[0], t[1], t[2], t[3], t[4], DEFAULT_HYGIENE_THRESHOLDS[6]];
  }

  if (thresholds.length === 4) {
    const t = thresholds as readonly [number, number, number, number];
    return [
      0,
      t[0],
      t[1],
      t[2],
      t[3],
      DEFAULT_HYGIENE_THRESHOLDS[5],
      DEFAULT_HYGIENE_THRESHOLDS[6],
    ];
  }

  return DEFAULT_HYGIENE_THRESHOLDS;
}

/**
 * Calculate hygiene level from decay points using thresholds.
 */
export function calculateHygieneLevel(points: number, thresholds: HygieneThresholds): HygieneLevel {
  if (points >= thresholds[6]) return 6;
  if (points >= thresholds[5]) return 5;
  if (points >= thresholds[4]) return 4;
  if (points >= thresholds[3]) return 3;
  if (points >= thresholds[2]) return 2;
  if (points >= thresholds[1]) return 1;
  return 0;
}

/**
 * Clamp an arbitrary number into a valid HygieneLevel (0-6).
 */
export function clampHygieneLevel(level: number): HygieneLevel {
  return Math.min(6, Math.max(0, Math.floor(level))) as HygieneLevel;
}

/**
 * Get the minimum points that correspond to a given hygiene level.
 *
 * Level 0 maps to 0 points.
 * Levels 1-6 map to the threshold boundary for that level.
 */
export function getMinPointsForLevel(
  level: HygieneLevel,
  thresholds: HygieneThresholds = DEFAULT_HYGIENE_THRESHOLDS
): number {
  // HygieneLevel (0-6) is validated and HygieneThresholds is a trusted 7-element tuple
  return getTuple(thresholds, level);
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
  isFootPart = false,
  currentLevel?: HygieneLevel
): number {
  let multiplier = getRecord(ACTIVITY_MULTIPLIERS, activity);

  // Apply footwear multiplier only for feet-related parts
  if (isFootPart && footwear) {
    multiplier *= getRecord(FOOTWEAR_MULTIPLIERS, footwear);
  }

  // Apply environment multiplier
  if (environment) {
    multiplier *= getRecord(ENVIRONMENT_MULTIPLIERS, environment);
  }

  // Optional level-aware decay curve (kept optional for backward compatibility)
  if (currentLevel !== undefined) {
    // HygieneLevel (0-6) is validated and HYGIENE_DECAY_MULTIPLIERS is a trusted 7-element tuple
    multiplier *= getTuple(HYGIENE_DECAY_MULTIPLIERS, currentLevel);
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
    setRecord(bodyParts, region, {
      points: 0,
      level: 0,
    });
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
  const exactMatches = ['feet', 'toes', 'ankles'];
  const suffixes = ['Foot', 'Ankle', 'Heel', 'Sole', 'Arch', 'Toe'];

  return exactMatches.includes(bodyPart) || suffixes.some((s) => bodyPart.endsWith(s));
}

/**
 * Reset hygiene for specific body parts (cleaning action).
 */
export function resetBodyPartHygiene(
  state: NpcHygieneState,
  bodyParts: string[],
  targetLevel: HygieneLevel = 0,
  decayRates?: Record<string, BodyPartHygieneConfig>,
  at: Date = new Date()
): NpcHygieneState {
  const newBodyParts = { ...state.bodyParts };
  const now = at.toISOString();

  for (const part of bodyParts) {
    if (getRecordOptional(newBodyParts, part)) {
      const thresholds = getRecordOptional(decayRates, part)?.thresholds ?? DEFAULT_HYGIENE_THRESHOLDS;
      setRecord(newBodyParts, part, {
        points: getMinPointsForLevel(targetLevel, thresholds),
        level: targetLevel,
        lastUpdatedAt: now,
      });
    }
  }

  return {
    ...state,
    bodyParts: newBodyParts,
  };
}

/**
 * Increase hygiene (dirtying) for specific body parts by adding decay points.
 *
 * This is useful for instant "dirtying events" (mud, sweat, etc.) that should
 * add an explicit amount of decay rather than applying per-turn multipliers.
 */
export function increaseBodyPartHygiene(
  state: NpcHygieneState,
  decayRates: Record<string, BodyPartHygieneConfig>,
  bodyParts: string[],
  pointsToAdd: number,
  at: Date = new Date()
): NpcHygieneState {
  const newBodyParts = { ...state.bodyParts };
  const now = at.toISOString();

  for (const part of bodyParts) {
    const current = getRecordOptional(newBodyParts, part) ?? { points: 0, level: 0 };
    const thresholds = getRecordOptional(decayRates, part)?.thresholds ?? DEFAULT_HYGIENE_THRESHOLDS;
    const nextPoints = Math.max(0, current.points + Math.max(0, pointsToAdd));
    const nextLevel = calculateHygieneLevel(nextPoints, thresholds);

    setRecord(newBodyParts, part, {
      points: nextPoints,
      level: nextLevel,
      lastUpdatedAt: now,
    });
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
export function combineSensoryWithHygiene(baseDescription: string, modifier: string): string {
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
  const now = new Date().toISOString();
  let newBodyParts = { ...state.bodyParts };

  // Handle cleaning first
  if (input.cleanedParts?.length) {
    newBodyParts = applyCleaning(newBodyParts, input.cleanedParts, now);
  }

  // Apply decay to each body part
  for (const [bodyPart, config] of Object.entries(decayRates)) {
    if (input.cleanedParts?.includes(bodyPart)) continue;

    setRecord(newBodyParts, bodyPart, calculateUpdatedPartState(
      bodyPart,
      config,
      getRecordOptional(newBodyParts, bodyPart),
      input,
      now
    ));
  }

  return { ...state, bodyParts: newBodyParts };
}

/**
 * Internal helper to apply cleaning to specified body parts.
 */
function applyCleaning(
  bodyParts: Record<string, BodyPartHygieneState>,
  cleanedParts: string[],
  now: string
): Record<string, BodyPartHygieneState> {
  const result = { ...bodyParts };
  for (const part of cleanedParts) {
    if (getRecordOptional(result, part)) {
      setRecord(result, part, { points: 0, level: 0, lastUpdatedAt: now });
    }
  }
  return result;
}

/**
 * Internal helper to calculate updated state for a single body part.
 */
function calculateUpdatedPartState(
  bodyPart: string,
  config: BodyPartHygieneConfig,
  currentPart: BodyPartHygieneState | undefined,
  input: HygieneUpdateInput,
  now: string
): BodyPartHygieneState {
  const existingPart = currentPart ?? { points: 0, level: 0 };
  const currentLevel = clampHygieneLevel(existingPart.level);

  const decayPoints = calculateDecayPoints(
    config.baseDecayPerTurn,
    input.turnsElapsed,
    input.activity,
    input.footwear,
    input.environment,
    isFootRelatedPart(bodyPart),
    currentLevel
  );

  const newPoints = existingPart.points + decayPoints;
  const newLevel = calculateHygieneLevel(newPoints, config.thresholds);

  return {
    points: newPoints,
    level: newLevel,
    lastUpdatedAt: now,
  };
}
