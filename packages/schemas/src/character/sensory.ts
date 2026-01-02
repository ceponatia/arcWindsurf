import { z } from 'zod';
import { BODY_REGIONS, type BodyRegion } from './regions.js';
import {
  RegionScentSchema,
  type RegionScent,
  RegionTextureSchema,
  type RegionTexture,
  RegionVisualSchema,
  type RegionVisual,
  RegionFlavorSchema,
  type RegionFlavor,
  BodyRegionDataSchema,
  type BodyRegionData,
} from '../body-regions/sensory-types.js';

export {
  RegionScentSchema,
  type RegionScent,
  RegionTextureSchema,
  type RegionTexture,
  RegionVisualSchema,
  type RegionVisual,
  RegionFlavorSchema,
  type RegionFlavor,
  BodyRegionDataSchema,
  type BodyRegionData,
};

// Re-export domain-specific modules
export * from './scent/scent-tiers.js';
export * from './scent/default-scents.js';
export * from './scent/resolvers.js';
export * from './scent/utils.js';
export * from './touch/utils.js';
export * from './taste/utils.js';
export * from './appearance/utils.js';

/**
 * Complete body map with optional sensory data for each region.
 * Only include regions that have notable/distinctive characteristics.
 *
 * Example usage:
 * ```ts
 * const body: BodyMap = {
 *   hair: {
 *     scent: { primary: "lavender shampoo", intensity: 0.6 },
 *     visual: { description: "Long, wavy auburn hair" }
 *   },
 *   hands: {
 *     texture: { primary: "calloused", temperature: "warm" },
 *     visual: { description: "Strong, weathered hands" }
 *   }
 * }
 * ```
 */
const BODY_MAP_SHAPE: Record<string, z.ZodTypeAny> = {};
for (const region of BODY_REGIONS) {
  BODY_MAP_SHAPE[region] = BodyRegionDataSchema.optional();
}

// We cast the schema to ensure the inferred type matches BodyMap
export const BodyMapSchema = z.object(BODY_MAP_SHAPE).partial() as z.ZodType<BodyMap>;

export type BodyMap = Partial<Record<BodyRegion, BodyRegionData>>;
