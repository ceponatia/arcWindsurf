import type { AppearanceAttributeDef } from '../types.js';

export const GROIN_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  groin: {
    description: { label: 'Description', placeholder: 'e.g., groomed, natural' },
  },
  buttocks: {
    description: { label: 'Description', placeholder: 'e.g., firm, round, flat' },
  },
  leftButtock: {
    description: { label: 'Description', placeholder: 'e.g., firm, round, flat' },
  },
  rightButtock: {
    description: { label: 'Description', placeholder: 'e.g., firm, round, flat' },
  },
  anus: {
    description: { label: 'Description', placeholder: 'e.g., tight, loose' },
  },
  penis: {
    description: { label: 'Description', placeholder: 'e.g., large, small, circumcised' },
  },
  vagina: {
    description: { label: 'Description', placeholder: 'e.g., tight, loose' },
  },
};
