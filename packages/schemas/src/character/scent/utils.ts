import { BODY_REGIONS, type BodyRegion } from '../regions.js';
import type { RegionScent } from '../../body-regions/sensory-types.js';
import type { BodyMap } from '../sensory.js';

/**
 * Get scent data for a specific body region, with fallback chain.
 * If the specific region has no scent, falls back to torso (general body scent).
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The scent data, or undefined if none found
 */
export function getRegionScent(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionScent | undefined {
  if (!bodyMap) return undefined;

  // Try the specific region first
  const regionData = bodyMap[region];
  if (regionData?.scent) {
    return regionData.scent;
  }

  // Fallback to torso for general body scent (unless already checking torso)
  if (region !== 'torso') {
    return bodyMap.torso?.scent;
  }

  return undefined;
}

/**
 * Get all regions that have scent data defined.
 */
export function getScentRegions(bodyMap: BodyMap | undefined): BodyRegion[] {
  if (!bodyMap) return [];

  return BODY_REGIONS.filter((region) => bodyMap[region]?.scent !== undefined);
}

/**
 * Build a flat scent summary from body map (for backwards compatibility with old ScentSchema).
 * Returns a record with keys like "hairScent", "bodyScent" etc.
 */
export function buildLegacyScentSummary(bodyMap: BodyMap | undefined): Record<string, string> {
  if (!bodyMap) return {};

  const result: Record<string, string> = {};

  if (bodyMap.hair?.scent) {
    result['hairScent'] = bodyMap.hair.scent.primary;
  }

  if (bodyMap.torso?.scent) {
    result['bodyScent'] = bodyMap.torso.scent.primary;
  }

  // Check for perfume-like scents on neck/chest (common perfume application areas)
  const perfumeRegions: BodyRegion[] = ['neck', 'chest'];
  for (const region of perfumeRegions) {
    const scent = bodyMap[region]?.scent;
    if (scent && !result['perfume']) {
      result['perfume'] = scent.primary;
    }
  }

  return result;
}
