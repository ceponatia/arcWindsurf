export const SENSORY_INDICATOR_TYPES = ['scent', 'texture', 'visual', 'flavor', 'sound'] as const;

export type SensoryType = (typeof SENSORY_INDICATOR_TYPES)[number];
