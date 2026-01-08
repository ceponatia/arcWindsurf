/**
 * Body sensory data parsing functions.
 */

import type {
  BodyMap,
  BodyRegion,
  RegionScent,
  RegionTexture,
  RegionVisual,
  RegionFlavor,
} from '@minimal-rpg/schemas';
import { BODY_REGIONS, resolveBodyRegion } from '@minimal-rpg/schemas';
import {
  detectSensoryType,
  extractIntensity,
  extractTemperature,
  extractMoisture,
} from './keywords.js';

// ============================================================================
// Parser Types
// ============================================================================

export interface BodyEntryInput {
  /** Raw text for a single body region entry, e.g., "hair: scent: musky, floral" */
  raw: string;
}

export interface ParsedBodyEntry {
  region: BodyRegion;
  scent?: RegionScent;
  texture?: RegionTexture;
  visual?: RegionVisual;
  flavor?: RegionFlavor;
}

export interface BodyParseResult {
  bodyMap: BodyMap;
  warnings: string[];
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a scent description into RegionScent.
 * Input: "strong musk, lightly floral, hint of vanilla"
 * Output: { primary: "musk", notes: ["floral", "vanilla"], intensity: 0.8 }
 */
export function parseScent(description: string): RegionScent | undefined {
  const parts = description
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter((p): p is string => p.length > 0);
  const firstPart = parts[0];
  if (!firstPart) return undefined;

  // First part is primary scent
  const { intensity: primaryIntensity, cleaned: primaryCleaned } = extractIntensity(firstPart);
  if (!primaryCleaned) return undefined;

  const scent: RegionScent = {
    primary: primaryCleaned,
    intensity: primaryIntensity,
  };

  // Remaining parts are notes
  if (parts.length > 1) {
    const notes: string[] = [];
    const intensityPattern = /^intensity\s*$/i;
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const { cleaned } = extractIntensity(part);
      // Skip "intensity X" entries
      if (cleaned && !intensityPattern.exec(cleaned)) {
        notes.push(cleaned);
      }
    }
    if (notes.length > 0) {
      scent.notes = notes.slice(0, 4); // Max 4 notes per schema
    }
  }

  return scent;
}

/**
 * Parse a texture description into RegionTexture.
 * Input: "calloused, warm, slightly damp"
 * Output: { primary: "calloused", temperature: "warm", moisture: "damp" }
 */
export function parseTexture(description: string): RegionTexture | undefined {
  const { temperature, cleaned: afterTemp } = extractTemperature(description);
  const { moisture, cleaned: afterMoisture } = extractMoisture(afterTemp);

  const parts = afterMoisture
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;

  // First non-empty part is primary texture
  const primary = parts[0];
  if (!primary) return undefined;

  const texture: RegionTexture = {
    primary,
    temperature,
    moisture,
  };

  // Remaining parts are notes
  if (parts.length > 1) {
    const notes = parts.slice(1).filter((p) => p.length > 0);
    if (notes.length > 0) {
      texture.notes = notes.slice(0, 4);
    }
  }

  return texture;
}

/**
 * Parse a visual description into RegionVisual.
 * Input: "long auburn waves, freckled, slight scar"
 * Output: { description: "long auburn waves", features: ["freckled", "slight scar"] }
 */
export function parseVisual(description: string): RegionVisual | undefined {
  const parts = description
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter((p): p is string => p.length > 0);
  const firstPart = parts[0];
  if (!firstPart) return undefined;

  const visual: RegionVisual = {
    description: firstPart,
  };

  if (parts.length > 1) {
    visual.features = parts.slice(1, 9); // Max 8 features per schema
  }

  return visual;
}

/**
 * Parse a flavor description into RegionFlavor.
 * Input: "strong salty, slightly sweet, hint of metallic"
 * Output: { primary: "salty", notes: ["sweet", "metallic"], intensity: 0.8 }
 */
export function parseFlavor(description: string): RegionFlavor | undefined {
  const parts = description
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter((p): p is string => p.length > 0);
  const firstPart = parts[0];
  if (!firstPart) return undefined;

  // First part is primary flavor
  const { intensity: primaryIntensity, cleaned: primaryCleaned } = extractIntensity(firstPart);
  if (!primaryCleaned) return undefined;

  const flavor: RegionFlavor = {
    primary: primaryCleaned,
    intensity: primaryIntensity,
  };

  // Remaining parts are notes
  if (parts.length > 1) {
    const notes: string[] = [];
    const intensityPattern = /^intensity\s*$/i;
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const { cleaned } = extractIntensity(part);
      // Skip "intensity X" entries
      if (cleaned && !intensityPattern.exec(cleaned)) {
        notes.push(cleaned);
      }
    }
    if (notes.length > 0) {
      flavor.notes = notes.slice(0, 4); // Max 4 notes per schema
    }
  }

  return flavor;
}

/**
 * Parse a single body entry line.
 * Formats supported:
 *   "hair: scent: musky, floral"
 *   "hair scent: musky"
 *   "hair - scent - musky"
 */
export function parseBodyEntry(input: string): ParsedBodyEntry | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Normalize separators: convert " - " and " : " to ":"
  const normalized = trimmed
    .replace(/[\s]*-[\s]*/g, ':')
    .replace(/[\s]*:[\s]*/g, ':')
    .toLowerCase();

  // Split by first colon to get region
  const parts = normalized
    .split(':')
    .map((p) => p.trim())
    .filter((p): p is string => p.length > 0);
  const firstPart = parts[0];
  const secondPart = parts[1];
  if (!firstPart || !secondPart) return null;

  // First part should be body region
  const region = resolveBodyRegion(firstPart);
  if (!BODY_REGIONS.includes(region)) {
    // Couldn't resolve to valid region
    return null;
  }

  // Detect sensory type from remaining parts
  let sensoryType: 'scent' | 'texture' | 'visual' | 'flavor' | null = null;
  let dataStartIndex = 1;

  // Check if second part is a sensory type indicator
  const detectedType = detectSensoryType(secondPart);
  // Filter to only types that are part of BodyMap (exclude 'sound')
  if (detectedType && detectedType !== 'sound') {
    sensoryType = detectedType;
    dataStartIndex = 2;
  } else {
    // Try to infer from the content
    const content = parts.slice(1).join(':');
    const inferredType = detectSensoryType(content);
    sensoryType = inferredType && inferredType !== 'sound' ? inferredType : 'scent';
    dataStartIndex = 1;
  }

  // Rejoin remaining content
  const dataContent = parts.slice(dataStartIndex).join(':').trim();
  if (!dataContent) return null;

  const entry: ParsedBodyEntry = { region };

  switch (sensoryType) {
    case 'scent': {
      const scent = parseScent(dataContent);
      if (scent) entry.scent = scent;
      break;
    }
    case 'texture': {
      const texture = parseTexture(dataContent);
      if (texture) entry.texture = texture;
      break;
    }
    case 'visual': {
      const visual = parseVisual(dataContent);
      if (visual) entry.visual = visual;
      break;
    }
    case 'flavor': {
      const flavor = parseFlavor(dataContent);
      if (flavor) entry.flavor = flavor;
      break;
    }
  }

  return entry;
}

/**
 * Parse multiple body entries (one per line or semicolon-separated).
 */
export function parseBodyEntries(input: string): BodyParseResult {
  const bodyMap: BodyMap = {};
  const warnings: string[] = [];

  // Split by newlines or semicolons (but not commas within descriptions)
  const lines = input
    .split(/[\n;]/)
    .map((l) => l.trim())
    .filter((l): l is string => l.length > 0);

  for (const line of lines) {
    const entry = parseBodyEntry(line);
    if (!entry) {
      warnings.push(`Could not parse: "${line.slice(0, 50)}${line.length > 50 ? '...' : ''}"`);
      continue;
    }

    // Merge into body map
    bodyMap[entry.region] ??= {};

    const regionData = bodyMap[entry.region];
    if (regionData) {
      if (entry.scent) {
        regionData.scent = entry.scent;
      }
      if (entry.texture) {
        regionData.texture = entry.texture;
      }
      if (entry.visual) {
        regionData.visual = entry.visual;
      }
      if (entry.flavor) {
        regionData.flavor = entry.flavor;
      }
    }
  }

  return { bodyMap, warnings };
}
