/**
 * Body sensory data parsing and formatting utilities.
 * Moved from schemas package to keep schemas pure.
 *
 * This module provides helpers for:
 * - Parsing structured body sensory descriptions
 * - Formatting BodyMap data back to human-readable text
 * - Extracting intensity, temperature, moisture from text
 * - Body region alias resolution for intent detection
 */

export * from './parsers.js';
export * from './formatters.js';
export * from './keywords.js';

// Re-export body region aliases from schemas for intent detection
// Agents need these to resolve player input like "touch her boobs" → "breasts"
export {
  BODY_REGION_ALIASES,
  BODY_REGIONS,
  resolveBodyRegion,
  isBodyReference,
  type BodyRegion,
} from '@minimal-rpg/schemas';
