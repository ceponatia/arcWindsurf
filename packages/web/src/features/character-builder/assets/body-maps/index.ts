import { HUMAN_MALE_DEF } from './human.js';
import type { BodyMapDefinition } from './types.js';

export const getBodyMap = (): BodyMapDefinition => {
  // For now, use human male map for all races and genders as requested
  return HUMAN_MALE_DEF;
};
