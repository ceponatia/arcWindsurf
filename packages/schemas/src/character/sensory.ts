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
import { BodyMapSchema, type BodyMap } from './body-map.js';

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
  BodyMapSchema,
  type BodyMap,
};

// Re-export domain-specific modules
export * from './scent/scent-tiers.js';
export * from './scent/default-scents.js';
export * from './scent/resolvers.js';
export * from './scent/utils.js';
export * from './touch/utils.js';
export * from './taste/utils.js';
export * from './appearance/utils.js';
