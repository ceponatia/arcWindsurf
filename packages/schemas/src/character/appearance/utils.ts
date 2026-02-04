import { getRecordOptional } from '../../shared/record-helpers.js';
import type { BodyRegion } from '../regions.js';
import type { RegionVisual } from '../../body-regions/sensory-types.js';
import type { BodyMap } from '../body-map.js';

/**
 * Get visual data for a specific body region.
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The visual data, or undefined if none found
 */
export function getRegionVisual(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionVisual | undefined {
  return getRecordOptional(bodyMap, region)?.visual;
}
