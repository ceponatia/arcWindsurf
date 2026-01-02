import type { AppearanceAttributeDef } from '../types.js';
import { APPEARANCE_LEGS_BUILD, APPEARANCE_LEGS_LENGTH } from '../../shared/physique.js';

export const LEGS_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  leftLeg: {
    build: { label: 'Build', values: APPEARANCE_LEGS_BUILD },
    length: { label: 'Length', values: APPEARANCE_LEGS_LENGTH },
  },
  rightLeg: {
    build: { label: 'Build', values: APPEARANCE_LEGS_BUILD },
    length: { label: 'Length', values: APPEARANCE_LEGS_LENGTH },
  },
};
