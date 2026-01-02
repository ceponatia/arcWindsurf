import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { CLEAN_SKIN } from '../constants.js';
import { LEG_REGIONS } from './regions.js';
import type { RegionScent } from '../sensory-types.js';

type LegsRegion = (typeof LEG_REGIONS)[number];

const LEGS_PROFILE: HygieneProfile = {
  0: {
    scent: { primary: 'fresh', intensity: 0.1 },
    texture: { moisture: 'dry', primary: 'smooth' },
  },
  1: {
    scent: { primary: 'warm skin', intensity: 0.2 },
    texture: { moisture: 'normal' },
  },
  2: {
    scent: { primary: 'stale sweat', intensity: 0.35 },
    texture: { moisture: 'damp' },
  },
  3: {
    scent: { primary: 'strong sweat', intensity: 0.5 },
    texture: { moisture: 'damp', temperature: 'warm' },
    visual: { descriptionAppend: 'glistening' },
  },
  4: {
    scent: { primary: 'pungent', intensity: 0.7 },
    texture: { moisture: 'wet', temperature: 'warm' },
    visual: { descriptionAppend: 'sweaty' },
  },
  5: {
    scent: { primary: 'overpowering', intensity: 0.85 },
    texture: { moisture: 'wet', primary: 'sticky' },
    visual: { descriptionAppend: 'filthy', featuresAdd: ['grime'] },
  },
  6: {
    scent: { primary: 'putrid', intensity: 1.0 },
    texture: { moisture: 'wet', primary: 'slimy' },
    visual: { descriptionAppend: 'crusted with filth', skinConditionOverride: 'marked' },
  },
};

export const LEGS_HYGIENE_CONFIG = {
  default: LEGS_PROFILE,
};

export const LEGS_HYGIENE_MODIFIERS = flattenHygieneData(LEGS_HYGIENE_CONFIG, [...LEG_REGIONS]);

export const LEGS_DEFAULT_SCENTS: Partial<Record<LegsRegion, RegionScent>> = {
  legs: CLEAN_SKIN,
  leftLeg: CLEAN_SKIN,
  rightLeg: CLEAN_SKIN,
  thighs: CLEAN_SKIN,
  leftThigh: CLEAN_SKIN,
  rightThigh: CLEAN_SKIN,
  knees: CLEAN_SKIN,
  leftKnee: CLEAN_SKIN,
  rightKnee: CLEAN_SKIN,
  calves: CLEAN_SKIN,
  leftCalf: CLEAN_SKIN,
  rightCalf: CLEAN_SKIN,
  leftShin: CLEAN_SKIN,
  rightShin: CLEAN_SKIN,
  ankles: CLEAN_SKIN,
};
