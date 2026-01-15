import {
  CHARACTER_DETAIL_AREAS,
  BODY_REGIONS,
  APPEARANCE_REGIONS,
  APPEARANCE_REGION_ATTRIBUTES,
  getRecordOptional,
  PERSONALITY_DIMENSIONS,
  CORE_EMOTIONS,
  EMOTION_INTENSITIES,
  ATTACHMENT_STYLES,
  CORE_VALUES,
  FEAR_CATEGORIES,
  COPING_MECHANISMS,
  STRANGER_DEFAULTS,
  WARMTH_RATES,
  SOCIAL_ROLES,
  CONFLICT_STYLES,
  CRITICISM_RESPONSES,
  BOUNDARY_TYPES,
  VOCABULARY_LEVELS,
  SENTENCE_STRUCTURES,
  FORMALITY_LEVELS,
  HUMOR_FREQUENCIES,
  HUMOR_TYPES,
  EXPRESSIVENESS_LEVELS,
  DIRECTNESS_LEVELS,
  PACE_LEVELS,
  STRESS_RESPONSES,
  RECOVERY_RATES,
  type CharacterDetailArea,
  type BodyRegion,
  type BodyMap,
  type AppearanceRegion,
  type PersonalityDimension,
  type CoreEmotion,
  type EmotionIntensity,
  type AttachmentStyle,
  type CoreValue,
  type FearCategory,
  type CopingMechanism,
} from '@minimal-rpg/schemas';

// ============================================================================
// Character Builder Complexity Modes
// ============================================================================

/**
 * Complexity mode for the Character Builder.
 * Controls which sections and fields are visible.
 */
export type CharacterBuilderMode = 'quick' | 'standard' | 'advanced';

/**
 * Configuration for which sections are visible in each mode.
 */
export interface ModeConfig {
  /** Display name for the mode */
  label: string;
  /** Description of what fields are shown */
  description: string;
  /** Approximate field count for UI display */
  fieldCount: string;
  /** Which sections are visible */
  sections: {
    basics: boolean;
    appearance: boolean;
    personality: boolean;
    body: boolean;
    details: boolean;
  };
  /** Which fields in basics are visible */
  basicFields: {
    name: boolean;
    age: boolean;
    gender: boolean;
    race: boolean;
    alignment: boolean;
    summary: boolean;
    backstory: boolean;
    tags: boolean;
    profilePic: boolean;
    personality: boolean;
  };
}

/**
 * Mode configurations for each complexity level.
 */
export const MODE_CONFIGS: Record<CharacterBuilderMode, ModeConfig> = {
  quick: {
    label: 'Quick',
    description: 'Essential character info',
    fieldCount: '5 fields',
    sections: {
      basics: true,
      appearance: false,
      personality: false,
      body: false,
      details: false,
    },
    basicFields: {
      name: true,
      age: true,
      gender: true,
      race: true,
      alignment: true,
      summary: true,
      backstory: false,
      tags: false,
      profilePic: true,
      personality: false,
    },
  },
  standard: {
    label: 'Standard',
    description: 'Common character details',
    fieldCount: '~20 fields',
    sections: {
      basics: true,
      appearance: true,
      personality: true,
      body: false,
      details: false,
    },
    basicFields: {
      name: true,
      age: true,
      gender: true,
      race: true,
      alignment: true,
      summary: true,
      backstory: true,
      tags: true,
      profilePic: true,
      personality: true,
    },
  },
  advanced: {
    label: 'Advanced',
    description: 'Full character profile',
    fieldCount: '~100 fields',
    sections: {
      basics: true,
      appearance: true,
      personality: true,
      body: true,
      details: true,
    },
    basicFields: {
      name: true,
      age: true,
      gender: true,
      race: true,
      alignment: true,
      summary: true,
      backstory: true,
      tags: true,
      profilePic: true,
      personality: true,
    },
  },
};

export interface DetailFormEntry {
  label: string;
  value: string;
  area: CharacterDetailArea;
  importance: string;
  tags: string;
  notes: string;
}

/**
 * Form entry for body sensory data.
 * Supports raw text input that gets parsed to structured BodyMap.
 */
export interface BodySensoryEntry {
  /** Body region (hair, torso, feet, etc.) */
  region: BodyRegion;
  /** Sensory type: scent, texture, or flavor (visual is covered by appearance section) */
  type: 'scent' | 'texture' | 'flavor';
  /** Raw text description (parsed on save) */
  raw: string;
}

/**
 * Form entry for appearance data.
 * Each entry specifies a region, attribute, and value.
 */
export interface AppearanceEntry {
  /** Appearance region (hair, eyes, arms, etc.) */
  region: AppearanceRegion;
  /** Attribute key for the region (e.g., 'color' for hair) */
  attribute: string;
  /** Value for the attribute */
  value: string;
}

// ============================================================================
// Personality Form Entries
// ============================================================================

/**
 * Form entry for personality dimension scores (Big Five).
 */
export interface DimensionEntry {
  dimension: PersonalityDimension;
  score: number;
}

/**
 * Form entry for values with priority ranking.
 */
export interface ValueEntry {
  value: CoreValue;
  priority: number;
}

/**
 * Form entry for fears.
 */
export interface FearEntry {
  category: FearCategory;
  specific: string;
  intensity: number;
  triggers: string[];
  copingMechanism: CopingMechanism;
}

/**
 * Form state for emotional baseline.
 */
export interface EmotionalBaselineEntry {
  current: CoreEmotion;
  intensity: EmotionIntensity;
  blend?: CoreEmotion;
  moodBaseline: CoreEmotion;
  moodStability: number;
}

/**
 * Form state for social patterns.
 */
export interface SocialPatternEntry {
  strangerDefault: (typeof STRANGER_DEFAULTS)[number];
  warmthRate: (typeof WARMTH_RATES)[number];
  preferredRole: (typeof SOCIAL_ROLES)[number];
  conflictStyle: (typeof CONFLICT_STYLES)[number];
  criticismResponse: (typeof CRITICISM_RESPONSES)[number];
  boundaries: (typeof BOUNDARY_TYPES)[number];
}

/**
 * Form state for speech style.
 */
export interface SpeechStyleEntry {
  vocabulary: (typeof VOCABULARY_LEVELS)[number];
  sentenceStructure: (typeof SENTENCE_STRUCTURES)[number];
  formality: (typeof FORMALITY_LEVELS)[number];
  humor: (typeof HUMOR_FREQUENCIES)[number];
  humorType?: (typeof HUMOR_TYPES)[number];
  expressiveness: (typeof EXPRESSIVENESS_LEVELS)[number];
  directness: (typeof DIRECTNESS_LEVELS)[number];
  pace: (typeof PACE_LEVELS)[number];
}

/**
 * Form state for stress behavior.
 */
export interface StressBehaviorEntry {
  primary: (typeof STRESS_RESPONSES)[number];
  secondary?: (typeof STRESS_RESPONSES)[number];
  threshold: number;
  recoveryRate: (typeof RECOVERY_RATES)[number];
  soothingActivities: string[];
  stressIndicators: string[];
}

/**
 * Complete personality form state.
 */
export interface PersonalityFormState {
  /** Simple trait keywords for quick personality summary */
  traits: string;
  /** Core dimension scores */
  dimensions: DimensionEntry[];
  /** Emotional baseline */
  emotionalBaseline: EmotionalBaselineEntry;
  /** Core values (prioritized) */
  values: ValueEntry[];
  /** Fears */
  fears: FearEntry[];
  /** Attachment style */
  attachment: AttachmentStyle;
  /** Social patterns */
  social: SocialPatternEntry;
  /** Speech style */
  speech: SpeechStyleEntry;
  /** Stress behavior */
  stress: StressBehaviorEntry;
}

export interface FormState {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  race: string;
  alignment: string;
  summary: string;
  backstory: string;
  tags: string;
  /** Profile picture URL for chat display */
  profilePic: string;
  personality: string;
  /** Structured personality data (dimensions, values, fears, etc.) */
  personalityMap: PersonalityFormState;
  /** Free-text appearance (alternative to structured entries) */
  appearance: string;
  /** Unified body map containing sensory and appearance data */
  body: BodyMap;
  details: DetailFormEntry[];
}

export type FormKey = keyof FormState;
export type FormFieldErrors = Partial<Record<FormKey, string>>;
export type UpdateFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const SENSORY_TYPES = ['scent', 'texture', 'flavor'] as const;
export type SensoryType = (typeof SENSORY_TYPES)[number];

export const createDetailEntry = (): DetailFormEntry => ({
  label: '',
  value: '',
  area: CHARACTER_DETAIL_AREAS[0],
  importance: '0.5',
  tags: '',
  notes: '',
});

export const createBodySensoryEntry = (): BodySensoryEntry => ({
  region: BODY_REGIONS[0],
  type: 'scent',
  raw: '',
});

export const createAppearanceEntry = (): AppearanceEntry => ({
  region: APPEARANCE_REGIONS[0],
  attribute: 'height',
  value: '',
});

// ============================================================================
// Personality Factory Functions
// ============================================================================

export const createDimensionEntry = (
  dimension: PersonalityDimension = PERSONALITY_DIMENSIONS[0]
): DimensionEntry => ({
  dimension,
  score: 0.5,
});

export const createValueEntry = (): ValueEntry => ({
  value: CORE_VALUES[0],
  priority: 5,
});

export const createFearEntry = (): FearEntry => ({
  category: FEAR_CATEGORIES[0],
  specific: '',
  intensity: 0.5,
  triggers: [],
  copingMechanism: COPING_MECHANISMS[0],
});

export const createEmotionalBaselineEntry = (): EmotionalBaselineEntry => ({
  current: CORE_EMOTIONS[7], // anticipation
  intensity: EMOTION_INTENSITIES[0], // mild
  moodBaseline: CORE_EMOTIONS[1], // trust
  moodStability: 0.5,
});

export const createSocialPatternEntry = (): SocialPatternEntry => ({
  strangerDefault: STRANGER_DEFAULTS[1], // neutral
  warmthRate: WARMTH_RATES[1], // moderate
  preferredRole: SOCIAL_ROLES[1], // supporter
  conflictStyle: CONFLICT_STYLES[1], // diplomatic
  criticismResponse: CRITICISM_RESPONSES[1], // reflective
  boundaries: BOUNDARY_TYPES[1], // healthy
});

export const createSpeechStyleEntry = (): SpeechStyleEntry => ({
  vocabulary: VOCABULARY_LEVELS[1], // average
  sentenceStructure: SENTENCE_STRUCTURES[2], // moderate
  formality: FORMALITY_LEVELS[1], // neutral
  humor: HUMOR_FREQUENCIES[2], // occasional
  expressiveness: EXPRESSIVENESS_LEVELS[2], // moderate
  directness: DIRECTNESS_LEVELS[1], // direct
  pace: PACE_LEVELS[2], // moderate
});

export const createStressBehaviorEntry = (): StressBehaviorEntry => ({
  primary: STRESS_RESPONSES[2], // freeze
  threshold: 0.5,
  recoveryRate: RECOVERY_RATES[1], // moderate
  soothingActivities: [],
  stressIndicators: [],
});

export const createPersonalityFormState = (): PersonalityFormState => ({
  traits: '',
  dimensions: PERSONALITY_DIMENSIONS.map((d) => createDimensionEntry(d)),
  emotionalBaseline: createEmotionalBaselineEntry(),
  values: [],
  fears: [],
  attachment: ATTACHMENT_STYLES[0], // secure
  social: createSocialPatternEntry(),
  speech: createSpeechStyleEntry(),
  stress: createStressBehaviorEntry(),
});

export const createInitialState = (): FormState => ({
  id: '',
  name: '',
  age: 21,
  gender: '',
  race: 'Human',
  alignment: 'True Neutral',
  summary: '',
  backstory: '',
  tags: '',
  profilePic: '',
  personality: '',
  personalityMap: createPersonalityFormState(),
  appearance: '',
  body: {},
  details: [createDetailEntry()],
});

// ============================================================================
// Smart Entry Helpers
// ============================================================================

/**
 * Get all used appearance region+attribute combinations.
 * Returns a Set of strings in format "region:attribute".
 */
export function getUsedAppearanceCombinations(entries: AppearanceEntry[]): Set<string> {
  const used = new Set<string>();
  for (const entry of entries) {
    if (entry.value.trim()) {
      used.add(`${entry.region}:${entry.attribute}`);
    }
  }
  return used;
}

/**
 * Find the next available appearance entry (region + attribute) that hasn't been used.
 * Iterates through regions in APPEARANCE_REGIONS order, then attributes in their defined order.
 * Filters regions based on gender.
 *
 * @param usedCombinations - Set of used "region:attribute" combinations
 * @param availableRegions - Regions available based on character gender
 * @returns The next available entry, or null if all combinations are used
 */
export function findNextAvailableAppearanceEntry(
  usedCombinations: Set<string>,
  availableRegions: readonly AppearanceRegion[]
): AppearanceEntry | null {
  // Iterate through regions in order
  for (const region of APPEARANCE_REGIONS) {
    // Skip if region isn't available for this gender
    if (!availableRegions.includes(region)) continue;

    const regionAttrs = getRecordOptional(APPEARANCE_REGION_ATTRIBUTES, region);
    if (!regionAttrs) continue;

    // Iterate through attributes in order
    for (const attrKey of Object.keys(regionAttrs)) {
      const combo = `${region}:${attrKey}`;
      if (!usedCombinations.has(combo)) {
        return { region, attribute: attrKey, value: '' };
      }
    }
  }

  // All combinations used - return null to indicate no more entries available
  return null;
}

/**
 * Check if an appearance combination is already used.
 */
export function isAppearanceCombinationUsed(
  entries: AppearanceEntry[],
  region: AppearanceRegion,
  attribute: string,
  excludeIndex?: number
): boolean {
  return entries.some(
    (entry, idx) =>
      idx !== excludeIndex &&
      entry.region === region &&
      entry.attribute === attribute &&
      entry.value.trim() !== ''
  );
}

/**
 * Get all used body sensory region+type combinations.
 * Returns a Set of strings in format "region:type".
 */
export function getUsedSensoryCombinations(entries: BodySensoryEntry[]): Set<string> {
  const used = new Set<string>();
  for (const entry of entries) {
    if (entry.raw.trim()) {
      used.add(`${entry.region}:${entry.type}`);
    }
  }
  return used;
}

/**
 * Find the next available body sensory entry (region + type) that hasn't been used.
 * Iterates through regions in BODY_REGIONS order, then sensory types in order.
 * Filters regions based on gender.
 *
 * @param usedCombinations - Set of used "region:type" combinations
 * @param availableRegions - Regions available based on character gender
 * @returns The next available entry, or null if all combinations are used
 */
export function findNextAvailableSensoryEntry(
  usedCombinations: Set<string>,
  availableRegions: BodyRegion[]
): BodySensoryEntry | null {
  // Iterate through regions in order
  for (const region of BODY_REGIONS) {
    // Skip if region isn't available for this gender
    if (!availableRegions.includes(region)) continue;

    // Iterate through sensory types in order
    for (const type of SENSORY_TYPES) {
      const combo = `${region}:${type}`;
      if (!usedCombinations.has(combo)) {
        return { region, type, raw: '' };
      }
    }
  }

  // All combinations used - return null to indicate no more entries available
  return null;
}

/**
 * Check if a sensory combination is already used.
 */
export function isSensoryCombinationUsed(
  entries: BodySensoryEntry[],
  region: BodyRegion,
  type: SensoryType,
  excludeIndex?: number
): boolean {
  return entries.some(
    (entry, idx) =>
      idx !== excludeIndex &&
      entry.region === region &&
      entry.type === type &&
      entry.raw.trim() !== ''
  );
}
