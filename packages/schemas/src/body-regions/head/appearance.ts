import type { AppearanceAttributeDef } from '../types.js';

export const HEAD_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  hair: {
    color: { label: 'Color', placeholder: 'e.g., black, brown, blonde, red' },
    style: { label: 'Style', placeholder: 'e.g., long, short, braided, messy' },
  },
  eyes: {
    color: { label: 'Color', placeholder: 'e.g., brown, blue, green' },
    shape: { label: 'Shape', placeholder: 'e.g., almond, round, hooded' },
  },
};
