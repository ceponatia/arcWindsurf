/**
 * @minimal-rpg/generator
 *
 * Random content generator for Minimal RPG.
 * Generates complete or partial game entities using themed value pools.
 */

// ============================================================================
// Shared Types
// ============================================================================

export type {
  WeightedValue,
  ValuePool,
  GenerationMode,
  BaseGeneratorOptions,
  GenerationMeta,
} from './types.js';

// ============================================================================
// Shared Utilities
// ============================================================================

export {
  pickRandom,
  pickWeighted,
  pickFromPool,
  pickMultiple,
  pickRandomCount,
  randomInt,
  randomFloat,
  randomFloatRounded,
  randomBool,
  randomId,
  shuffle,
} from './shared/index.js';

// ============================================================================
// Character Generation
// ============================================================================

export {
  // Main generator
  generateCharacter,
  // Types
  type CharacterGeneratorOptions,
  type CharacterGeneratorResult,
  type CharacterTheme,
  type CharacterBasicsPools,
  type CharacterAppearancePools,
  type CharacterPersonalityPools,
  type CharacterBodyPools,
  type CharacterDetailsPools,
  type BodySensoryPools,
  // Themes
  BASE_THEME,
  MODERN_WOMAN_THEME,
  MODERN_MAN_THEME,
  CHARACTER_THEMES,
  getTheme,
  // Filters
  getBodyRegionsForGender,
  getAppearanceRegionsForGender,
  isRegionForGender,
  isAppearanceRegionForGender,
  filterRegionsByGender,
  GENDER_BODY_REGIONS,
  GENDER_APPEARANCE_REGIONS,
  // Pools namespace
  pools,
} from './character/index.js';

// ============================================================================
// Convenience Aliases
// ============================================================================

/**
 * All available themes by ID.
 */
export { CHARACTER_THEMES as THEMES } from './character/index.js';
