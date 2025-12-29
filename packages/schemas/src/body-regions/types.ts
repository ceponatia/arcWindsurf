export type BodySide = 'left' | 'right';

/**
 * The high-level body group buckets used for batch operations (hygiene, defaults).
 */
export const BODY_REGION_GROUP_KEYS = [
  'head',
  'neck',
  'upperBody',
  'torso',
  'arms',
  'groin',
  'legs',
  'feet',
] as const;

export type BodyRegionGroupKey = (typeof BODY_REGION_GROUP_KEYS)[number];
