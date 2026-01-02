import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { CLEAN_SKIN } from '../constants.js';
import { TORSO_REGIONS } from './regions.js';
import type { RegionScent } from '../sensory-types.js';

type TorsoRegion = (typeof TORSO_REGIONS)[number];

const TORSO_PROFILE: HygieneProfile = {
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

// Navel might collect lint/dirt faster or smell different
const NAVEL_PROFILE: HygieneProfile = {
  ...TORSO_PROFILE,
  3: { ...TORSO_PROFILE[3], scent: { primary: 'musty', intensity: 0.6 } },
  4: { ...TORSO_PROFILE[4], scent: { primary: 'sour', intensity: 0.8 } },
};

export const TORSO_HYGIENE_CONFIG = {
  default: TORSO_PROFILE,
  groups: {
    navel: {
      regions: ['navel'],
      profile: NAVEL_PROFILE,
    },
  },
};

export const TORSO_HYGIENE_MODIFIERS = flattenHygieneData(TORSO_HYGIENE_CONFIG, [...TORSO_REGIONS]);

export const TORSO_DEFAULT_SCENTS: Partial<Record<TorsoRegion, RegionScent>> = {
  torso: { ...CLEAN_SKIN, intensity: 0.25 },
  abdomen: CLEAN_SKIN,
  navel: CLEAN_SKIN,
  leftSide: CLEAN_SKIN,
  rightSide: CLEAN_SKIN,
  waist: CLEAN_SKIN,
  hips: CLEAN_SKIN,
  leftHip: CLEAN_SKIN,
  rightHip: CLEAN_SKIN,
  pelvis: CLEAN_SKIN,
};
