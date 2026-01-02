import type { AppearanceAttributeDef } from '../types.js';
import { APPEARANCE_FEET_SIZES } from '../../shared/physique.js';

export const FEET_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  leftFoot: {
    size: { label: 'Size', values: APPEARANCE_FEET_SIZES },
    shape: { label: 'Shape', placeholder: 'e.g., narrow, wide, average' },
  },
  rightFoot: {
    size: { label: 'Size', values: APPEARANCE_FEET_SIZES },
    shape: { label: 'Shape', placeholder: 'e.g., narrow, wide, average' },
  },
};
