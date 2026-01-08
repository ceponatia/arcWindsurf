import {
  APPEARANCE_REGIONS,
  APPEARANCE_REGION_ATTRIBUTES,
  BODY_REGIONS,
  type AppearanceRegion,
  type BodyRegion,
} from '@minimal-rpg/schemas';
import {
  type AppearanceEntry,
  type BodySensoryEntry,
  type SensoryType,
  SENSORY_TYPES,
} from './types.js';

/**
 * Clamp a number between min and max.
 */
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

    const regionAttrs = APPEARANCE_REGION_ATTRIBUTES[region];
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
