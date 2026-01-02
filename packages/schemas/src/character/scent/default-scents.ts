import type { BodyRegion } from '../regions.js';
import type { RegionScent } from '../../body-regions/sensory-types.js';
import { ALL_HYGIENE_MODIFIERS } from '../../body-regions/hygiene-registry.js';

import { HEAD_DEFAULT_SCENTS } from '../../body-regions/head/hygiene-data.js';
import { NECK_DEFAULT_SCENTS } from '../../body-regions/neck/hygiene-data.js';
import { UPPER_BODY_DEFAULT_SCENTS } from '../../body-regions/upper-body/hygiene-data.js';
import { TORSO_DEFAULT_SCENTS } from '../../body-regions/torso/hygiene-data.js';
import { ARMS_DEFAULT_SCENTS } from '../../body-regions/arms/hygiene-data.js';
import { GROIN_DEFAULT_SCENTS } from '../../body-regions/groin/hygiene-data.js';
import { LEGS_DEFAULT_SCENTS } from '../../body-regions/legs/hygiene-data.js';
import { FEET_DEFAULT_SCENTS } from '../../body-regions/feet/hygiene-data.js';

export const DEFAULT_SCENTS: Partial<Record<BodyRegion, RegionScent>> = {
  ...HEAD_DEFAULT_SCENTS,
  ...NECK_DEFAULT_SCENTS,
  ...UPPER_BODY_DEFAULT_SCENTS,
  ...TORSO_DEFAULT_SCENTS,
  ...ARMS_DEFAULT_SCENTS,
  ...GROIN_DEFAULT_SCENTS,
  ...LEGS_DEFAULT_SCENTS,
  ...FEET_DEFAULT_SCENTS,
};

/**
 * Hygiene-level scent modifiers for hygiene-modulated regions.
 *
 * These are intentionally high-level and can be refined later; they should stay
 * safe and non-explicit.
 */
export const HYGIENE_SCENT_MODIFIERS = ALL_HYGIENE_MODIFIERS;
