import { getRecordOptional } from '../../shared/record-helpers.js';
import type { BodyRegion } from '../regions.js';
import type { RegionTexture } from '../../body-regions/sensory-types.js';
import type { BodyMap } from '../sensory.js';

/**
 * Get texture data for a specific body region.
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The texture data, or undefined if none found
 */
export function getRegionTexture(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionTexture | undefined {
  if (!bodyMap) return undefined;
  return getRecordOptional(bodyMap, region)?.texture;
}
