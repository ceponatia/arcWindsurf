import { HEAD_REGIONS } from './head/regions.js';
import { NECK_REGIONS } from './neck/regions.js';
import { UPPER_BODY_REGIONS } from './upper-body/regions.js';
import { TORSO_REGIONS } from './torso/regions.js';
import { ARMS_REGIONS } from './arms/regions.js';
import { GROIN_REGIONS } from './groin/regions.js';
import { LEG_REGIONS } from './legs/regions.js';
import { FEET_REGIONS } from './feet/regions.js';

export * from './types.js';
export * from './sensory-types.js';
export * from './constants.js';
export * from './head/index.js';
export * from './neck/index.js';
export * from './upper-body/index.js';
export * from './torso/index.js';
export * from './arms/index.js';
export * from './groin/index.js';
export * from './legs/index.js';
export * from './feet/index.js';
export * from './hygiene-data.js';
export * from './hierarchy.js';
export * from './utils.js';

/**
 * Expanded canonical body regions (left/right + detailed toes).
 */
export const BODY_REGIONS = [
  ...HEAD_REGIONS,
  ...NECK_REGIONS,
  ...UPPER_BODY_REGIONS,
  ...TORSO_REGIONS,
  ...ARMS_REGIONS,
  ...GROIN_REGIONS,
  ...LEG_REGIONS,
  ...FEET_REGIONS,
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];
