import { BODY_REGIONS, type BodyRegion } from '../regions.js';
import type { RegionFlavor } from '../../body-regions/sensory-types.js';
import type { BodyMap } from '../sensory.js';

/**
 * Get flavor data for a specific body region.
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The flavor data, or undefined if none found
 */
export function getRegionFlavor(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionFlavor | undefined {
  if (!bodyMap) return undefined;
  return bodyMap[region]?.flavor;
}

/**
 * Get all regions that have flavor data defined.
 */
export function getFlavorRegions(bodyMap: BodyMap | undefined): BodyRegion[] {
  if (!bodyMap) return [];

  return BODY_REGIONS.filter((region) => bodyMap[region]?.flavor !== undefined);
}
