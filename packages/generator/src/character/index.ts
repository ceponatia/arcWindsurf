/**
 * Character generation module.
 * Exports all character generation functionality.
 */

// Types
export type {
  CharacterGeneratorOptions,
  CharacterGeneratorResult,
  CharacterTheme,
  CharacterBasicsPools,
  CharacterAppearancePools,
  CharacterPersonalityPools,
  CharacterBodyPools,
  CharacterDetailsPools,
  BodySensoryPools,
  GenderRegionConfig,
  GenderAppearanceRegionConfig,
} from './types.js';

// Main generator
export { generateCharacter } from './generate.js';

// Themes
export {
  BASE_THEME,
  MODERN_WOMAN_THEME,
  MODERN_MAN_THEME,
  CHARACTER_THEMES,
  getTheme,
} from './themes/index.js';

// Filters
export {
  getBodyRegionsForGender,
  getAppearanceRegionsForGender,
  isRegionForGender,
  isAppearanceRegionForGender,
  filterRegionsByGender,
  GENDER_BODY_REGIONS,
  GENDER_APPEARANCE_REGIONS,
} from './filters.js';

// Pools (for custom theme composition)
export * as pools from './pools/index.js';
