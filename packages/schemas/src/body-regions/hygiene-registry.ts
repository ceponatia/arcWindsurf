import { ARMS_HYGIENE_MODIFIERS } from './arms/hygiene-data.js';
import { FEET_HYGIENE_MODIFIERS } from './feet/hygiene-data.js';
import { GROIN_HYGIENE_MODIFIERS } from './groin/hygiene-data.js';
import { HEAD_HYGIENE_MODIFIERS } from './head/hygiene-data.js';
import { LEGS_HYGIENE_MODIFIERS } from './legs/hygiene-data.js';
import { NECK_HYGIENE_MODIFIERS } from './neck/hygiene-data.js';
import { TORSO_HYGIENE_MODIFIERS } from './torso/hygiene-data.js';
import { UPPER_BODY_HYGIENE_MODIFIERS } from './upper-body/hygiene-data.js';

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
