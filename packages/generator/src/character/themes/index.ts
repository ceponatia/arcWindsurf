/**
 * Character themes - exports all available themes.
 */

export { BASE_THEME } from './base.js';
export { MODERN_WOMAN_THEME } from './modern-woman.js';
export { MODERN_MAN_THEME } from './modern-man.js';

import { getRecordOptional } from '@minimal-rpg/schemas';
import { BASE_THEME } from './base.js';
import { MODERN_WOMAN_THEME } from './modern-woman.js';
import { MODERN_MAN_THEME } from './modern-man.js';
import type { CharacterTheme } from '../types.js';

/**
 * All available character themes by ID.
 */
export const CHARACTER_THEMES: Record<string, CharacterTheme> = {
  base: BASE_THEME,
  'modern-woman': MODERN_WOMAN_THEME,
  'modern-man': MODERN_MAN_THEME,
};

/**
 * Get a theme by ID, falling back to base theme.
 */
export function getTheme(id: string): CharacterTheme {
  return getRecordOptional(CHARACTER_THEMES, id) ?? BASE_THEME;
}
