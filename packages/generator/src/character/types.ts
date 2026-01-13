/**
 * Character-specific generator types.
 */

import type {
  Gender,
  Race,
  BodyRegion,
  AppearanceRegion,
  CharacterProfile,
  PersonalityDimension,
  CoreEmotion,
  EmotionIntensity,
  AttachmentStyle,
  CoreValue,
  FearCategory,
  CopingMechanism,
  CharacterDetailArea,
  AppearanceHeight,
  AppearanceTorso,
  AppearanceArmsBuild,
  AppearanceLegsBuild,
  AppearanceFeetSize,
} from '@minimal-rpg/schemas';
import type { BaseGeneratorOptions, ValuePool, GenerationMeta } from '../types.js';

// ============================================================================
// Character Generation Options
// ============================================================================

/**
 * Options for character generation.
 */
export interface CharacterGeneratorOptions extends BaseGeneratorOptions {
  /** Theme to use for generation */
  theme: CharacterTheme;
  /** Existing partial character to fill in */
  existing?: Partial<CharacterProfile>;
}

/**
 * Result of character generation.
 */
export interface CharacterGeneratorResult {
  /** The generated character profile */
  character: CharacterProfile;
  /** Metadata about the generation */
  meta: GenerationMeta;
}

// ============================================================================
// Character Theme Definition
// ============================================================================

/**
 * A character theme defines pools of values and generation biases.
 * Themes can extend other themes to create variations.
 */
export interface CharacterTheme {
  /** Unique identifier for the theme */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the character archetype */
  description: string;

  /** Default gender for this theme (can be overridden by existing data) */
  defaultGender?: Gender;

  /** Value pools for basics */
  basics: CharacterBasicsPools;

  /** Value pools for appearance/physique */
  appearance: CharacterAppearancePools;

  /** Value pools for personality */
  personality: CharacterPersonalityPools;

  /** Value pools for body sensory data */
  body: CharacterBodyPools;

  /** Value pools for details/facts */
  details: CharacterDetailsPools;

  /** Tags to add to generated characters */
  defaultTags?: string[];
}

// ============================================================================
// Pool Definitions by Category
// ============================================================================

/**
 * Pools for basic character info.
 */
export interface CharacterBasicsPools {
  /** Pool of first names */
  firstNames: ValuePool<string>;
  /** Pool of last names (optional) */
  lastNames?: ValuePool<string>;
  /** Pool of races (optional, falls back to schema RACES) */
  races?: ValuePool<Race>;
  /** Age range [min, max] */
  ageRange: [number, number];
  /** Pool of summary templates (use {name} for interpolation) */
  summaryTemplates: ValuePool<string>;
  /** Pool of backstory templates */
  backstoryTemplates: ValuePool<string>;
  /** Pool of personality trait keywords */
  personalityTraits: ValuePool<string>;
}

/**
 * Pools for appearance attributes.
 */
export interface CharacterAppearancePools {
  /** Height values */
  heights: ValuePool<AppearanceHeight>;
  /** Body build/torso types */
  builds: ValuePool<AppearanceTorso>;
  /** Skin tones */
  skinTones: ValuePool<string>;
  /** Hair colors */
  hairColors: ValuePool<string>;
  /** Hair styles */
  hairStyles: ValuePool<string>;
  /** Hair lengths */
  hairLengths: ValuePool<string>;
  /** Eye colors */
  eyeColors: ValuePool<string>;
  /** Eye shapes */
  eyeShapes?: ValuePool<string>;
  /** Face shapes */
  faceShapes?: ValuePool<string>;
  /** Face features */
  faceFeatures?: ValuePool<string>;
  /** Arm builds */
  armBuilds?: ValuePool<AppearanceArmsBuild>;
  /** Leg builds */
  legBuilds?: ValuePool<AppearanceLegsBuild>;
  /** Foot sizes */
  footSizes?: ValuePool<AppearanceFeetSize>;
}

/**
 * Pools for personality attributes.
 */
export interface CharacterPersonalityPools {
  /** Trait keywords for simple personality */
  traits: ValuePool<string>;
  /** Dimension score ranges (0-1) - will generate around these midpoints */
  dimensionBiases?: Partial<Record<PersonalityDimension, [number, number]>>;
  /** Core values */
  values: ValuePool<CoreValue>;
  /** Fear categories */
  fearCategories: ValuePool<FearCategory>;
  /** Specific fear descriptions */
  fearDescriptions: ValuePool<string>;
  /** Fear triggers */
  fearTriggers?: ValuePool<string>;
  /** Coping mechanisms */
  copingMechanisms: ValuePool<CopingMechanism>;
  /** Attachment styles */
  attachmentStyles: ValuePool<AttachmentStyle>;
  /** Mood baselines */
  moodBaselines: ValuePool<CoreEmotion>;
  /** Current emotions */
  currentEmotions: ValuePool<CoreEmotion>;
  /** Emotion intensities */
  emotionIntensities: ValuePool<EmotionIntensity>;
  /** Soothing activities */
  soothingActivities?: ValuePool<string>;
  /** Stress indicators */
  stressIndicators?: ValuePool<string>;
}

/**
 * Sensory data pools for body regions.
 */
export interface BodySensoryPools {
  /** Primary scent notes */
  scentPrimaries: ValuePool<string>;
  /** Secondary scent notes */
  scentNotes?: ValuePool<string>;
  /** Primary textures */
  texturePrimaries: ValuePool<string>;
  /** Visual descriptions */
  visualDescriptions?: ValuePool<string>;
  /** Visual skin conditions (e.g., 'flawless', 'freckled') */
  visualSkinConditions?: ValuePool<string>;
  /** Visual features (e.g., 'beauty mark', 'dimple') */
  visualFeatures?: ValuePool<string>;
  /** Flavor notes (for intimate regions) */
  flavorPrimaries?: ValuePool<string>;
  /** Flavor notes (secondary) */
  flavorNotes?: ValuePool<string>;
}

/**
 * Pools for body sensory data.
 */
export interface CharacterBodyPools {
  /** General body sensory pools */
  general: BodySensoryPools;
  /** Region-specific overrides (optional) */
  regions?: Partial<Record<BodyRegion, Partial<BodySensoryPools>>>;
  /** Which regions to populate (empty = all appropriate for gender) */
  regionsToPopulate?: BodyRegion[];
  /** Probability (0-1) of populating each region */
  regionPopulationRate?: number;
}

/**
 * Pools for character details/facts.
 */
export interface CharacterDetailsPools {
  /** Detail labels by area */
  labels: Partial<Record<CharacterDetailArea, ValuePool<string>>>;
  /** Detail values by area */
  values: Partial<Record<CharacterDetailArea, ValuePool<string>>>;
  /** Number of details to generate [min, max] */
  countRange: [number, number];
  /** Areas to focus on */
  focusAreas?: CharacterDetailArea[];
}

// ============================================================================
// Region Filtering Types
// ============================================================================

/**
 * Gender-based region filtering configuration.
 */
export interface GenderRegionConfig {
  /** Regions only for female characters */
  femaleOnly: readonly BodyRegion[];
  /** Regions only for male characters */
  maleOnly: readonly BodyRegion[];
  /** All other regions are gender-neutral */
}

/**
 * Appearance regions follow similar filtering.
 */
export interface GenderAppearanceRegionConfig {
  femaleOnly: readonly AppearanceRegion[];
  maleOnly: readonly AppearanceRegion[];
}
