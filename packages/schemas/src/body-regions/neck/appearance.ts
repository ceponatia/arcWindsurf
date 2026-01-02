import type { AppearanceAttributeDef } from '../types.js';

export const NECK_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  neck: {
    description: { label: 'Description', placeholder: 'e.g., slender, thick, swan-like' },
  },
  nape: {
    description: { label: 'Description', placeholder: 'e.g., smooth, hairy' },
  },
  throat: {
    description: { label: 'Description', placeholder: 'e.g., prominent, smooth' },
  },
};
