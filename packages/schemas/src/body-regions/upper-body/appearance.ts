import type { AppearanceAttributeDef } from '../types.js';

export const UPPER_BODY_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  leftBreast: {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    shape: { label: 'Shape', placeholder: 'e.g., perky, full, soft' },
  },
  rightBreast: {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    shape: { label: 'Shape', placeholder: 'e.g., perky, full, soft' },
  },
  leftNipple: {
    description: { label: 'Description', placeholder: 'e.g., small, prominent' },
  },
  rightNipple: {
    description: { label: 'Description', placeholder: 'e.g., small, prominent' },
  },
};
