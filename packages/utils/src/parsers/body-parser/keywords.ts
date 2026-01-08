/**
 * Keyword mappings for body sensory parsing.
 */

import type { RegionTexture } from '@minimal-rpg/schemas';

// ============================================================================
// Intensity Keywords
// ============================================================================

export const INTENSITY_KEYWORDS: Record<string, number> = {
  // Strong indicators
  strong: 0.8,
  intense: 0.9,
  powerful: 0.85,
  heavy: 0.75,
  overwhelming: 1.0,
  potent: 0.85,
  rich: 0.7,
  bold: 0.75,
  pronounced: 0.7,

  // Medium indicators
  medium: 0.5,
  moderate: 0.5,
  noticeable: 0.5,
  distinct: 0.55,
  clear: 0.5,

  // Light indicators
  light: 0.3,
  faint: 0.2,
  subtle: 0.25,
  slight: 0.2,
  hint: 0.15,
  trace: 0.1,
  barely: 0.1,
  soft: 0.3,
  gentle: 0.25,
  mild: 0.35,
  delicate: 0.3,
  lightly: 0.3,
  slightly: 0.25,
};

// ============================================================================
// Temperature Keywords
// ============================================================================

export const TEMPERATURE_KEYWORDS: Record<string, RegionTexture['temperature']> = {
  cold: 'cold',
  icy: 'cold',
  freezing: 'cold',
  chilled: 'cold',
  cool: 'cool',
  chilly: 'cool',
  neutral: 'neutral',
  normal: 'neutral',
  warm: 'warm',
  heated: 'warm',
  hot: 'hot',
  burning: 'hot',
  feverish: 'hot',
};

// ============================================================================
// Moisture Keywords
// ============================================================================

export const MOISTURE_KEYWORDS: Record<string, RegionTexture['moisture']> = {
  dry: 'dry',
  parched: 'dry',
  normal: 'normal',
  damp: 'damp',
  moist: 'damp',
  clammy: 'damp',
  wet: 'wet',
  sweaty: 'wet',
  slick: 'wet',
};

// ============================================================================
// Sensory Type Keywords
// ============================================================================

/**
 * Keywords that indicate scent-related input or actions.
 * Used for:
 * - Parsing scent descriptions in character builder
 * - Detecting smell intent in player commands
 * - Generating scent-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export const SCENT_INDICATORS = [
  'scent',
  'smell',
  'sniff',
  'aroma',
  'fragrance',
  'odor',
  'odour',
  'whiff',
  'bouquet',
  'reek',
  'stench',
  'perfume',
  'stink',
  'inhale',
  'snuff',
] as const;

/**
 * Keywords that indicate texture/touch-related input or actions.
 * Used for:
 * - Parsing texture descriptions in character builder
 * - Detecting touch intent in player commands
 * - Generating touch-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export const TEXTURE_INDICATORS = [
  'texture',
  'feel',
  'touch',
  'surface',
  'handle',
  'grip',
  'stroke',
  'caress',
  'pat',
  'press',
  'rub',
  'poke',
  'prod',
  'grind',
  'tap',
] as const;

/**
 * Keywords that indicate visual-related input or actions.
 * Used for:
 * - Parsing visual descriptions in character builder
 * - Detecting look/examine intent in player commands
 * - Generating visual-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export const VISUAL_INDICATORS = [
  'visual',
  'look',
  'see',
  'appearance',
  'color',
  'colour',
  'examine',
  'inspect',
  'observe',
  'watch',
  'gaze',
  'stare',
  'glance',
  'view',
  'peer',
  'survey',
  'scan',
] as const;

/**
 * Keywords that indicate flavor/taste-related input or actions.
 * Used for:
 * - Parsing flavor descriptions in character builder
 * - Detecting taste intent in player commands
 * - Generating taste-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export const FLAVOR_INDICATORS = [
  'flavor',
  'flavour',
  'taste',
  'lick',
  'sample',
  'sip',
  'bite',
  'eat',
  'nibble',
  'savor',
  'savour',
  'chew',
] as const;

/**
 * Keywords that indicate sound/hearing-related input or actions.
 * Used for:
 * - Detecting listen intent in player commands
 * - Generating sound-related narrative
 *
 * Note: Base forms only - conjugations/suffixes handled automatically by containsSensoryKeyword()
 */
export const SOUND_INDICATORS = [
  'sound',
  'hear',
  'listen',
  'noise',
  'audio',
  'eavesdrop',
  'hearken',
] as const;

/**
 * All sensory indicator arrays grouped by sense type.
 */
export const SENSORY_INDICATORS = {
  scent: SCENT_INDICATORS,
  texture: TEXTURE_INDICATORS,
  visual: VISUAL_INDICATORS,
  flavor: FLAVOR_INDICATORS,
  sound: SOUND_INDICATORS,
} as const;

export type SensoryType = keyof typeof SENSORY_INDICATORS;

// ============================================================================
// Suffix-Aware Keyword Matching
// ============================================================================

/**
 * Common verb suffixes for sensory actions.
 * These are appended to base keywords to match conjugated forms.
 */
const VERB_SUFFIXES = ['s', 'es', 'ed', 'ing', 'er', 'est'] as const;

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if text contains a sensory keyword, accounting for common verb conjugations.
 * Uses word boundaries (\b) to ensure:
 * - Suffixes only match at the END of words (not in the middle)
 * - No spaces between root and suffix
 * - Prevents false positives in compound words
 *
 * Examples:
 * - "smell" matches: "smell", "smells", "smelling", "smelled"
 * - "smell" does NOT match: "goodsmell", "re-smell", "smell ing" (with space)
 *
 * @param text - The text to search in
 * @param keywords - Array of base keywords to match
 * @returns True if any keyword (with or without suffix) is found
 */
export function containsSensoryKeyword(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();

  for (const keyword of keywords) {
    const escapedKeyword = escapeRegex(keyword);

    // Create regex: \b{keyword}(s|es|ed|ing|er|est)?\b
    // \b = word boundary (ensures whole word match)
    // (...)? = optional suffix group
    // Final \b ensures suffix is at end of word (no characters after)
    const suffixPattern = VERB_SUFFIXES.map(escapeRegex).join('|');
    const pattern = new RegExp(`\\b${escapedKeyword}(${suffixPattern})?\\b`, 'i');

    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect sensory type from text using suffix-aware keyword matching.
 * Matches base keywords plus common conjugations (s, es, ed, ing, er, est).
 */
export function detectSensoryType(text: string): SensoryType | null {
  if (containsSensoryKeyword(text, SCENT_INDICATORS)) return 'scent';
  if (containsSensoryKeyword(text, TEXTURE_INDICATORS)) return 'texture';
  if (containsSensoryKeyword(text, VISUAL_INDICATORS)) return 'visual';
  if (containsSensoryKeyword(text, FLAVOR_INDICATORS)) return 'flavor';
  if (containsSensoryKeyword(text, SOUND_INDICATORS)) return 'sound';

  return null;
}

/**
 * Get an appropriate intensity keyword for a numeric intensity value.
 * Useful for generating narrative descriptions.
 *
 * @param intensity - Numeric intensity from 0.0 to 1.0
 * @returns An intensity keyword (e.g., "strong", "faint", "moderate")
 */
export function getIntensityWord(intensity: number): string {
  if (intensity >= 0.9) return 'overwhelming';
  if (intensity >= 0.8) return 'strong';
  if (intensity >= 0.7) return 'pronounced';
  if (intensity >= 0.6) return 'noticeable';
  if (intensity >= 0.5) return 'moderate';
  if (intensity >= 0.4) return 'mild';
  if (intensity >= 0.3) return 'light';
  if (intensity >= 0.2) return 'subtle';
  if (intensity >= 0.1) return 'faint';
  return 'barely noticeable';
}

/**
 * Get a set of intensity keywords that match a numeric range.
 * Useful for parsing player input with intensity modifiers.
 *
 * @param minIntensity - Minimum intensity (0.0 to 1.0)
 * @param maxIntensity - Maximum intensity (0.0 to 1.0)
 * @returns Array of keywords that fall within the range
 */
export function getIntensityKeywordsInRange(minIntensity: number, maxIntensity: number): string[] {
  return Object.entries(INTENSITY_KEYWORDS)
    .filter(([, value]) => value >= minIntensity && value <= maxIntensity)
    .map(([key]) => key);
}

/**
 * Extract intensity from a phrase, returning both the value and cleaned phrase.
 */
export function extractIntensity(phrase: string): { intensity: number; cleaned: string } {
  const words = phrase.toLowerCase().split(/\s+/);
  let intensity = 0.5; // default
  const cleanedWords: string[] = [];

  for (const word of words) {
    // Check for explicit intensity like "intensity 0.6" or "0.6"
    // Limit input length to prevent ReDoS attacks
    if (word.length > 1000) {
      continue; // Skip overly long inputs
    }
    const numPattern = /^(\d*\.?\d+)$/;
    const numMatch = numPattern.exec(word);
    if (numMatch?.[1]) {
      const parsed = parseFloat(numMatch[1]);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        intensity = parsed;
        continue;
      }
    }

    // Check for keyword intensity
    const keywordIntensity = INTENSITY_KEYWORDS[word];
    if (keywordIntensity !== undefined) {
      intensity = keywordIntensity;
      continue; // Don't include intensity keywords in the cleaned output
    }

    cleanedWords.push(word);
  }

  return { intensity, cleaned: cleanedWords.join(' ').trim() };
}

/**
 * Extract temperature from a phrase.
 */
export function extractTemperature(phrase: string): {
  temperature: RegionTexture['temperature'];
  cleaned: string;
} {
  const words = phrase.toLowerCase().split(/\s+/);
  let temperature: RegionTexture['temperature'] = 'neutral';
  const cleanedWords: string[] = [];

  for (const word of words) {
    const keywordTemp = TEMPERATURE_KEYWORDS[word];
    if (keywordTemp !== undefined) {
      temperature = keywordTemp;
      continue;
    }
    cleanedWords.push(word);
  }

  return { temperature, cleaned: cleanedWords.join(' ').trim() };
}

/**
 * Extract moisture from a phrase.
 */
export function extractMoisture(phrase: string): {
  moisture: RegionTexture['moisture'];
  cleaned: string;
} {
  const words = phrase.toLowerCase().split(/\s+/);
  let moisture: RegionTexture['moisture'] = 'normal';
  const cleanedWords: string[] = [];

  for (const word of words) {
    const keywordMoist = MOISTURE_KEYWORDS[word];
    if (keywordMoist !== undefined) {
      moisture = keywordMoist;
      continue;
    }
    cleanedWords.push(word);
  }

  return { moisture, cleaned: cleanedWords.join(' ').trim() };
}
