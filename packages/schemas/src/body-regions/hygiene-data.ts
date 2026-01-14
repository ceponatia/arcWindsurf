import { ARMS_HYGIENE_MODIFIERS, ARMS_DEFAULT_SCENTS, ARMS_SCENT_DATA } from './arms/hygiene-data.js';
import { FEET_HYGIENE_MODIFIERS, FEET_DEFAULT_SCENTS, FEET_SCENT_DATA } from './feet/hygiene-data.js';
import { GROIN_HYGIENE_MODIFIERS, GROIN_DEFAULT_SCENTS, GROIN_SCENT_DATA } from './groin/hygiene-data.js';
import { HEAD_HYGIENE_MODIFIERS, HEAD_DEFAULT_SCENTS, HEAD_SCENT_DATA } from './head/hygiene-data.js';
import { LEGS_HYGIENE_MODIFIERS, LEGS_DEFAULT_SCENTS, LEGS_SCENT_DATA } from './legs/hygiene-data.js';
import { NECK_HYGIENE_MODIFIERS, NECK_DEFAULT_SCENTS, NECK_SCENT_DATA } from './neck/hygiene-data.js';
import { TORSO_HYGIENE_MODIFIERS, TORSO_DEFAULT_SCENTS, TORSO_SCENT_DATA } from './torso/hygiene-data.js';
import {
  UPPER_BODY_HYGIENE_MODIFIERS,
  UPPER_BODY_DEFAULT_SCENTS,
  UPPER_BODY_SCENT_DATA,
} from './upper-body/hygiene-data.js';

/**
 * Combined hygiene modifiers for all body regions.
 */
export const ALL_HYGIENE_MODIFIERS = {
  ...ARMS_HYGIENE_MODIFIERS,
  ...FEET_HYGIENE_MODIFIERS,
  ...GROIN_HYGIENE_MODIFIERS,
  ...HEAD_HYGIENE_MODIFIERS,
  ...LEGS_HYGIENE_MODIFIERS,
  ...NECK_HYGIENE_MODIFIERS,
  ...TORSO_HYGIENE_MODIFIERS,
  ...UPPER_BODY_HYGIENE_MODIFIERS,
};

/**
 * Grouped scent defaults for logical management.
 * Granular regions like toes are grouped under their relevant parents (e.g., feet).
 */
export const GROUPED_DEFAULT_SCENTS = {
  head: HEAD_SCENT_DATA,
  neck: NECK_SCENT_DATA,
  upperBody: UPPER_BODY_SCENT_DATA,
  torso: TORSO_SCENT_DATA,
  arms: ARMS_SCENT_DATA,
  groin: GROIN_SCENT_DATA,
  legs: LEGS_SCENT_DATA,
  feet: FEET_SCENT_DATA,
};

/**
 * Flat map of all default scents for quick lookup.
 */
export const ALL_DEFAULT_SCENTS = {
  ...HEAD_DEFAULT_SCENTS,
  ...NECK_DEFAULT_SCENTS,
  ...UPPER_BODY_DEFAULT_SCENTS,
  ...TORSO_DEFAULT_SCENTS,
  ...ARMS_DEFAULT_SCENTS,
  ...GROIN_DEFAULT_SCENTS,
  ...LEGS_DEFAULT_SCENTS,
  ...FEET_DEFAULT_SCENTS,
};
