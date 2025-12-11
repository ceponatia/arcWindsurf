import { SENSORY_INDICATORS, containsSensoryKeyword } from '@minimal-rpg/utils';
import { BODY_REGION_ALIASES, BODY_REGIONS } from '@minimal-rpg/schemas';
import { type IntentType } from './intents.js';

/**
 * Rule-based fast-path intent detection for sensory keywords.
 *
 * This provides deterministic classification for inputs with clear sensory verbs,
 * reducing LLM token cost and improving accuracy for simple cases like:
 * - "I lick her foot" → taste
 * - "I smell her hair" → smell
 * - "I touch her hand" → touch
 *
 * Returns null for ambiguous/complex inputs that need LLM analysis.
 */

export interface RuleBasedDetection {
  /** Detected intent type */
  type: IntentType;
  /** Confidence (1.0 for rule-based matches) */
  confidence: number;
  /** Which keyword triggered the match */
  matchedKeyword?: string | undefined;
  /** Detected sensory type (for compound intents) */
  sensoryType?: 'smell' | 'touch' | 'taste' | 'listen' | 'look' | undefined;
}

/**
 * Detect sensory intent using deterministic keyword matching.
 * Returns null if no clear sensory keyword found (requires LLM).
 */
export function detectSensoryIntent(input: string): RuleBasedDetection | null {
  const lower = input.toLowerCase();

  // Priority order: taste > smell > touch > listen > look
  // (More specific senses first to avoid false positives)

  // Taste indicators (lick, taste, savor, etc.)
  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.flavor)) {
    const matched = findMatchedKeyword(lower, SENSORY_INDICATORS.flavor);
    return {
      type: 'taste',
      confidence: 1.0,
      sensoryType: 'taste',
      matchedKeyword: matched,
    };
  }

  // Smell indicators (smell, sniff, scent, aroma, etc.)
  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.scent)) {
    const matched = findMatchedKeyword(lower, SENSORY_INDICATORS.scent);
    return {
      type: 'smell',
      confidence: 1.0,
      sensoryType: 'smell',
      matchedKeyword: matched,
    };
  }

  // Touch indicators (touch, feel, stroke, caress, etc.)
  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.texture)) {
    const matched = findMatchedKeyword(lower, SENSORY_INDICATORS.texture);
    return {
      type: 'touch',
      confidence: 1.0,
      sensoryType: 'touch',
      matchedKeyword: matched,
    };
  }

  // Listen indicators (hear, listen, sound, etc.)
  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.sound)) {
    const matched = findMatchedKeyword(lower, SENSORY_INDICATORS.sound);
    return {
      type: 'listen',
      confidence: 1.0,
      sensoryType: 'listen',
      matchedKeyword: matched,
    };
  }

  // Look indicators (look, see, examine, inspect, etc.)
  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.visual)) {
    const matched = findMatchedKeyword(lower, SENSORY_INDICATORS.visual);
    // Check if 'examine' or 'inspect' for more detailed look
    if (matched === 'examine' || matched === 'inspect') {
      return {
        type: 'examine',
        confidence: 1.0,
        sensoryType: 'look',
        matchedKeyword: matched,
      };
    }
    return {
      type: 'look',
      confidence: 1.0,
      sensoryType: 'look',
      matchedKeyword: matched,
    };
  }

  // No clear sensory keyword found - requires LLM
  return null;
}

/**
 * Find which specific keyword matched in the input.
 * Used for debugging and logging.
 */
function findMatchedKeyword(input: string, keywords: readonly string[]): string | undefined {
  const lower = input.toLowerCase();

  for (const keyword of keywords) {
    // Match with verb conjugation suffixes
    const suffixes = ['s', 'es', 'ed', 'ing', 'er', 'est'];
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}(${suffixes.join('|')})?\\b`, 'i');

    if (pattern.test(lower)) {
      return keyword;
    }
  }

  return undefined;
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect all sensory types present in the input.
 * Used for compound intents with multiple sensory actions.
 *
 * Example: "He presses his nose to her foot, catching the scent and taste"
 * → Returns ['touch', 'smell', 'taste']
 */
export function detectAllSensoryTypes(input: string): {
  type: IntentType;
  sensoryType: 'smell' | 'touch' | 'taste' | 'listen' | 'look';
  matchedKeyword?: string | undefined;
}[] {
  const lower = input.toLowerCase();
  const detected: {
    type: IntentType;
    sensoryType: 'smell' | 'touch' | 'taste' | 'listen' | 'look';
    matchedKeyword?: string | undefined;
  }[] = [];

  // Check each sensory category
  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.flavor)) {
    detected.push({
      type: 'taste',
      sensoryType: 'taste',
      matchedKeyword: findMatchedKeyword(lower, SENSORY_INDICATORS.flavor),
    });
  }

  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.scent)) {
    detected.push({
      type: 'smell',
      sensoryType: 'smell',
      matchedKeyword: findMatchedKeyword(lower, SENSORY_INDICATORS.scent),
    });
  }

  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.texture)) {
    detected.push({
      type: 'touch',
      sensoryType: 'touch',
      matchedKeyword: findMatchedKeyword(lower, SENSORY_INDICATORS.texture),
    });
  }

  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.sound)) {
    detected.push({
      type: 'listen',
      sensoryType: 'listen',
      matchedKeyword: findMatchedKeyword(lower, SENSORY_INDICATORS.sound),
    });
  }

  if (containsSensoryKeyword(lower, SENSORY_INDICATORS.visual)) {
    const matched = findMatchedKeyword(lower, SENSORY_INDICATORS.visual);
    detected.push({
      type: matched === 'examine' || matched === 'inspect' ? 'examine' : 'look',
      sensoryType: 'look',
      matchedKeyword: matched,
    });
  }

  return detected;
}

/**
 * Find all body part references in input text along with their positions.
 */
function findAllBodyParts(input: string): { part: string; index: number }[] {
  const lower = input.toLowerCase();
  const allBodyParts = [...BODY_REGIONS, ...Object.keys(BODY_REGION_ALIASES)];

  // Sort by length descending to match longer/more specific terms first
  const sorted = allBodyParts.sort((a, b) => b.length - a.length);

  const found: { part: string; index: number }[] = [];
  const usedRanges: { start: number; end: number }[] = [];

  for (const part of sorted) {
    const pattern = new RegExp(`\\b${escapeRegex(part)}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(lower)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Skip if this range overlaps with an already-found longer body part
      const overlaps = usedRanges.some((range) => start < range.end && end > range.start);

      if (!overlaps) {
        found.push({ part, index: start });
        usedRanges.push({ start, end });
      }
    }
  }

  return found;
}

/**
 * Find the position of a sensory keyword in the input.
 */
function findSensoryKeywordPosition(
  input: string,
  sensoryType: 'smell' | 'touch' | 'taste' | 'listen' | 'look'
): number {
  const lower = input.toLowerCase();
  const indicators =
    sensoryType === 'smell'
      ? SENSORY_INDICATORS.scent
      : sensoryType === 'touch'
        ? SENSORY_INDICATORS.texture
        : sensoryType === 'taste'
          ? SENSORY_INDICATORS.flavor
          : sensoryType === 'listen'
            ? SENSORY_INDICATORS.sound
            : SENSORY_INDICATORS.visual;

  for (const keyword of indicators) {
    const suffixes = ['s', 'es', 'ed', 'ing', 'er', 'est'];
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}(${suffixes.join('|')})?\\b`, 'i');
    const match = pattern.exec(lower);
    if (match) {
      return match.index;
    }
  }

  return -1;
}

/**
 * Extract body part references from input text.
 * Uses the canonical BODY_REGION_ALIASES from schemas to recognize all valid body part references.
 *
 * When a sensoryType is provided, this function finds the body part that is
 * closest to the sensory verb, preferring body parts that appear after the verb
 * within the same clause (before the next sentence boundary).
 *
 * Examples:
 * - "I smell her feet" → "feet"
 * - "pressed to his lips" → "lips"
 * - "his nose smells her foot deeply. She feels a sensation in her vagina" → "foot" (for smell)
 *
 * Returns the matched alias/region string (not the resolved canonical region).
 * The caller can use resolveBodyRegion() to map it to the canonical region.
 */
export function extractBodyPart(
  input: string,
  sensoryType?: 'smell' | 'touch' | 'taste' | 'listen' | 'look'
): string | undefined {
  const bodyParts = findAllBodyParts(input);

  if (bodyParts.length === 0) {
    return undefined;
  }

  // If only one body part, return it regardless of context
  if (bodyParts.length === 1) {
    return bodyParts[0]!.part;
  }

  // If no sensory type provided, fall back to first body part by position
  if (!sensoryType) {
    // Sort by position and return the first one
    bodyParts.sort((a, b) => a.index - b.index);
    return bodyParts[0]!.part;
  }

  // Find position of the sensory verb
  const verbPos = findSensoryKeywordPosition(input, sensoryType);
  if (verbPos === -1) {
    // No sensory verb found, return first body part by position
    bodyParts.sort((a, b) => a.index - b.index);
    return bodyParts[0]!.part;
  }

  // Find sentence boundaries (periods, exclamation marks, question marks)
  const sentenceBoundaries: number[] = [];
  const boundaryPattern = /[.!?]/g;
  let match: RegExpExecArray | null;
  while ((match = boundaryPattern.exec(input)) !== null) {
    sentenceBoundaries.push(match.index);
  }

  // Find the sentence boundary after the verb (if any)
  const nextBoundary = sentenceBoundaries.find((pos) => pos > verbPos) ?? input.length;

  // Prefer body parts that come AFTER the verb but BEFORE the next sentence boundary
  // This handles "smells her foot" where "foot" comes after "smells"
  const afterVerbInSameSentence = bodyParts.filter(
    (bp) => bp.index > verbPos && bp.index < nextBoundary
  );

  if (afterVerbInSameSentence.length > 0) {
    // Return the one closest to the verb
    afterVerbInSameSentence.sort((a, b) => a.index - b.index);
    return afterVerbInSameSentence[0]!.part;
  }

  // If no body parts after the verb in same sentence, look for ones before the verb
  // This handles "her foot, he smells it" constructions
  const beforeVerb = bodyParts.filter((bp) => bp.index < verbPos);
  if (beforeVerb.length > 0) {
    // Return the closest one before the verb
    beforeVerb.sort((a, b) => b.index - a.index);
    return beforeVerb[0]!.part;
  }

  // Fallback to the first body part by position
  bodyParts.sort((a, b) => a.index - b.index);
  return bodyParts[0]!.part;
}
