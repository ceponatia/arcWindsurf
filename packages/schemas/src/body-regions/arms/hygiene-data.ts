import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { CLEAN_SKIN, NEUTRAL_FAINT } from '../constants.js';
import { ARMS_REGIONS } from './regions.js';
import type { RegionScent } from '../sensory-types.js';

type ArmsRegion = (typeof ARMS_REGIONS)[number];

const ARMS_PROFILE: HygieneProfile = {
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

const ARMPIT_PROFILE: HygieneProfile = {
  0: {
    scent: { primary: 'fresh', intensity: 0.1 },
    texture: { moisture: 'dry' },
  },
  1: {
    scent: { primary: 'faint musk', intensity: 0.2 },
    texture: { moisture: 'damp' },
  },
  2: {
    scent: { primary: 'body odor', intensity: 0.4 },
    texture: { moisture: 'damp', temperature: 'warm' },
  },
  3: {
    scent: { primary: 'strong sweat', intensity: 0.6 },
    texture: { moisture: 'wet', temperature: 'warm' },
    visual: { descriptionAppend: 'damp with sweat' },
  },
  4: {
    scent: { primary: 'pungent', intensity: 0.75 },
    texture: { moisture: 'wet', temperature: 'warm' },
    visual: { descriptionAppend: 'dripping with sweat' },
  },
  5: {
    scent: { primary: 'overpowering', intensity: 0.9 },
    texture: { moisture: 'wet', primary: 'sticky' },
    visual: { descriptionAppend: 'filthy', featuresAdd: ['grime'] },
  },
  6: {
    scent: { primary: 'putrid', intensity: 1.0 },
    texture: { moisture: 'wet', primary: 'slimy' },
    visual: { descriptionAppend: 'crusted with filth', skinConditionOverride: 'marked' },
  },
};

export const ARMS_HYGIENE_CONFIG = {
  default: ARMS_PROFILE,
  groups: {
    armpits: {
      regions: ['armpits', 'leftArmpit', 'rightArmpit'],
      profile: ARMPIT_PROFILE,
    },
  },
};

export const ARMS_HYGIENE_MODIFIERS = flattenHygieneData(ARMS_HYGIENE_CONFIG, [...ARMS_REGIONS]);

/**
 * Grouped defaults for arms regions.
 */
export const ARMS_SCENT_DATA = {
  arms: {
    armpits: {
      armpits: NEUTRAL_FAINT,
      leftArmpit: NEUTRAL_FAINT,
      rightArmpit: NEUTRAL_FAINT,
    },
    limbs: {
      arms: CLEAN_SKIN,
      leftArm: CLEAN_SKIN,
      rightArm: CLEAN_SKIN,
      leftUpperArm: CLEAN_SKIN,
      rightUpperArm: CLEAN_SKIN,
      leftElbow: CLEAN_SKIN,
      rightElbow: CLEAN_SKIN,
      leftForearm: CLEAN_SKIN,
      rightForearm: CLEAN_SKIN,
      leftWrist: CLEAN_SKIN,
      rightWrist: CLEAN_SKIN,
    },
    hands: {
      hands: CLEAN_SKIN,
      leftHand: CLEAN_SKIN,
      rightHand: CLEAN_SKIN,
      leftPalm: CLEAN_SKIN,
      rightPalm: CLEAN_SKIN,
      leftFingers: CLEAN_SKIN,
      rightFingers: CLEAN_SKIN,
    },
  },
};

export const ARMS_DEFAULT_SCENTS: Partial<Record<ArmsRegion, RegionScent>> = {
  ...ARMS_SCENT_DATA.arms.armpits,
  ...ARMS_SCENT_DATA.arms.limbs,
  ...ARMS_SCENT_DATA.arms.hands,
};
