import { z } from 'zod';
import { setPartialRecord } from '../shared/record-helpers.js';
import { BODY_REGIONS, type BodyRegion } from './regions.js';
import {
  BodyRegionDataSchema,
  type BodyRegionData,
} from '../body-regions/sensory-types.js';

/**
 * Complete body map with optional sensory data for each region.
 * Only include regions that have notable or distinctive characteristics.
 */
const BODY_MAP_SHAPE: Record<string, z.ZodTypeAny> = {};
for (const region of BODY_REGIONS) {
  setPartialRecord(BODY_MAP_SHAPE, region, BodyRegionDataSchema.optional());
}

// We cast the schema to ensure the inferred type matches BodyMap
export const BodyMapSchema = z.object(BODY_MAP_SHAPE).partial() as z.ZodType<BodyMap>;

export type BodyMap = Partial<Record<BodyRegion, BodyRegionData>>;
