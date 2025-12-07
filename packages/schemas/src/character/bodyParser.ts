/**
 * Parser for raw text body sensory descriptions.
 *
 * Converts human-friendly input like:
 *   "hair: scent: strong musk, lightly floral"
 *   "hands: texture: calloused, warm"
 *   "feet: scent: clean soap, intensity 0.3"
 *
 * Into structured BodyMap data:
 *   { hair: { scent: { primary: "musk", notes: ["floral"], intensity: 0.6 } } }
 */

import type { BodyMap, BodyRegion, RegionScent, RegionTexture, RegionVisual } from './body.js';
import { BODY_REGIONS, resolveBodyRegion } from './body.js';

// ============================================================================
// Intensity Keywords
// ============================================================================

const INTENSITY_KEYWORDS: Record<string, number> = {
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

const TEMPERATURE_KEYWORDS: Record<string, RegionTexture['temperature']> = {
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

const MOISTURE_KEYWORDS: Record<string, RegionTexture['moisture']> = {
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

const SCENT_INDICATORS = ['scent', 'smell', 'smells', 'aroma', 'fragrance', 'odor', 'odour'];
const TEXTURE_INDICATORS = ['texture', 'feel', 'feels', 'touch', 'surface'];
const VISUAL_INDICATORS = ['visual', 'look', 'looks', 'appearance', 'color', 'colour'];

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
}

export interface BodyParseResult {
  bodyMap: BodyMap;
  warnings: string[];
}

// ============================================================================
// Parser Implementation
// ============================================================================

/**
 * Extract intensity from a phrase, returning both the value and cleaned phrase.
 */
function extractIntensity(phrase: string): { intensity: number; cleaned: string } {
  const words = phrase.toLowerCase().split(/\s+/);
  let intensity = 0.5; // default
  const cleanedWords: string[] = [];

  for (const word of words) {
    // Check for explicit intensity like "intensity 0.6" or "0.6"
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
function extractTemperature(phrase: string): {
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
function extractMoisture(phrase: string): {
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

/**
 * Parse a scent description into RegionScent.
 * Input: "strong musk, lightly floral, hint of vanilla"
 * Output: { primary: "musk", notes: ["floral", "vanilla"], intensity: 0.8 }
 */
function parseScent(description: string): RegionScent | undefined {
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
function parseTexture(description: string): RegionTexture | undefined {
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
function parseVisual(description: string): RegionVisual | undefined {
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
 * Detect sensory type from text.
 */
function detectSensoryType(text: string): 'scent' | 'texture' | 'visual' | null {
  const lower = text.toLowerCase();

  for (const indicator of SCENT_INDICATORS) {
    if (lower.includes(indicator)) return 'scent';
  }

  for (const indicator of TEXTURE_INDICATORS) {
    if (lower.includes(indicator)) return 'texture';
  }

  for (const indicator of VISUAL_INDICATORS) {
    if (lower.includes(indicator)) return 'visual';
  }

  return null;
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
    .replace(/\s*-\s*/g, ':')
    .replace(/\s*:\s*/g, ':')
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
  let sensoryType: 'scent' | 'texture' | 'visual' | null = null;
  let dataStartIndex = 1;

  // Check if second part is a sensory type indicator
  sensoryType = detectSensoryType(secondPart);
  if (sensoryType) {
    dataStartIndex = 2;
  } else {
    // Try to infer from the content
    const content = parts.slice(1).join(':');
    sensoryType = detectSensoryType(content) ?? 'scent';
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
    }
  }

  return { bodyMap, warnings };
}

/**
 * Format a RegionScent back to human-readable text.
 */
export function formatScent(scent: RegionScent): string {
  const parts: string[] = [];

  // Add intensity prefix if not default
  if (scent.intensity >= 0.7) {
    parts.push('strong');
  } else if (scent.intensity <= 0.3) {
    parts.push('light');
  }

  parts.push(scent.primary);

  if (scent.notes?.length) {
    parts.push(...scent.notes);
  }

  return parts.join(', ');
}

/**
 * Format a RegionTexture back to human-readable text.
 */
export function formatTexture(texture: RegionTexture): string {
  const parts: string[] = [texture.primary];

  if (texture.temperature !== 'neutral') {
    parts.push(texture.temperature);
  }

  if (texture.moisture !== 'normal') {
    parts.push(texture.moisture);
  }

  if (texture.notes?.length) {
    parts.push(...texture.notes);
  }

  return parts.join(', ');
}

/**
 * Format a RegionVisual back to human-readable text.
 */
export function formatVisual(visual: RegionVisual): string {
  const parts: string[] = [visual.description];

  if (visual.features?.length) {
    parts.push(...visual.features);
  }

  return parts.join(', ');
}

/**
 * Format a full BodyMap to human-readable text (one line per region/sensory type).
 */
export function formatBodyMap(bodyMap: BodyMap): string {
  const lines: string[] = [];

  for (const region of BODY_REGIONS) {
    const data = bodyMap[region];
    if (!data) continue;

    if (data.scent) {
      lines.push(`${region}: scent: ${formatScent(data.scent)}`);
    }
    if (data.texture) {
      lines.push(`${region}: texture: ${formatTexture(data.texture)}`);
    }
    if (data.visual) {
      lines.push(`${region}: visual: ${formatVisual(data.visual)}`);
    }
  }

  return lines.join('\n');
}
