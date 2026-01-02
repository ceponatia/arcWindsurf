import type { AppearanceAttributeDef } from '../types.js';
import { APPEARANCE_ARMS_BUILD, APPEARANCE_ARMS_LENGTH } from '../../shared/physique.js';

export const ARMS_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  leftArm: {
    build: { label: 'Build', values: APPEARANCE_ARMS_BUILD },
    length: { label: 'Length', values: APPEARANCE_ARMS_LENGTH },
  },
  rightArm: {
    build: { label: 'Build', values: APPEARANCE_ARMS_BUILD },
    length: { label: 'Length', values: APPEARANCE_ARMS_LENGTH },
  },
  leftHand: {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    description: { label: 'Description', placeholder: 'e.g., calloused' },
  },
  rightHand: {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    description: { label: 'Description', placeholder: 'e.g., calloused' },
  },
};
