import type { AppearanceAttributeDef } from '../types.js';

export const TORSO_APPEARANCE: Record<string, Record<string, AppearanceAttributeDef>> = {
  torso: {
    description: { label: 'Description', placeholder: 'e.g., defined, soft, hairy' },
  },
  abdomen: {
    description: { label: 'Description', placeholder: 'e.g., flat, toned, soft' },
  },
  navel: {
    description: { label: 'Description', placeholder: 'e.g., innie, outie' },
  },
  leftSide: {
    description: { label: 'Description', placeholder: 'e.g., smooth, scarred' },
  },
  rightSide: {
    description: { label: 'Description', placeholder: 'e.g., smooth, scarred' },
  },
  waist: {
    description: { label: 'Description', placeholder: 'e.g., narrow, wide' },
  },
  hips: {
    description: { label: 'Description', placeholder: 'e.g., curvy, narrow' },
  },
  leftHip: {
    description: { label: 'Description', placeholder: 'e.g., curvy, narrow' },
  },
  rightHip: {
    description: { label: 'Description', placeholder: 'e.g., curvy, narrow' },
  },
  pelvis: {
    description: { label: 'Description', placeholder: 'e.g., wide, narrow' },
  },
};
