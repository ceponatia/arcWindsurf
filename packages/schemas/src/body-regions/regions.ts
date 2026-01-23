import { ARMS_REGIONS } from './arms/regions.js';
import { FEET_REGIONS } from './feet/regions.js';
import { GROIN_REGIONS } from './groin/regions.js';
import { HEAD_REGIONS } from './head/regions.js';
import { LEG_REGIONS } from './legs/regions.js';
import { NECK_REGIONS } from './neck/regions.js';
import { TORSO_REGIONS } from './torso/regions.js';
import { UPPER_BODY_REGIONS } from './upper-body/regions.js';

/**
 * Expanded canonical body regions (left/right + detailed toes).
 *
 * Kept in a leaf module (not the barrel) to avoid circular dependencies when
 * other barrel exports import from character modules.
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
