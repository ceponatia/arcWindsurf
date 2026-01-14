import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { CLEAN_SKIN, NEUTRAL } from '../constants.js';
import { HEAD_REGIONS } from './regions.js';
import type { RegionScent } from '../sensory-types.js';

type HeadRegion = (typeof HEAD_REGIONS)[number];

const HEAD_PROFILE: HygieneProfile = {
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

const HAIR_PROFILE: HygieneProfile = {
  0: {
    scent: { primary: 'fresh shampoo', intensity: 0.25 },
    texture: { moisture: 'dry', primary: 'soft' },
    visual: { descriptionAppend: 'clean and shiny' },
  },
  1: {
    scent: { primary: 'clean hair', intensity: 0.3 },
    texture: { moisture: 'normal' },
  },
  2: {
    scent: { primary: 'slightly stale hair', intensity: 0.35 },
    texture: { moisture: 'normal' },
  },
  3: {
    scent: { primary: 'oily hair', intensity: 0.45 },
    texture: { moisture: 'damp', primary: 'greasy' },
    visual: { descriptionAppend: 'slightly greasy' },
  },
  4: {
    scent: { primary: 'sour hair', intensity: 0.6 },
    texture: { moisture: 'damp', primary: 'oily' },
    visual: { descriptionAppend: 'greasy and matted' },
  },
  5: {
    scent: { primary: 'rank hair', intensity: 0.75 },
    texture: { moisture: 'wet', primary: 'sticky' },
    visual: { descriptionAppend: 'filthy and tangled' },
  },
  6: {
    scent: { primary: 'putrid hair', intensity: 0.9 },
    texture: { moisture: 'wet', primary: 'slimy' },
    visual: { descriptionAppend: 'crusted with filth', skinConditionOverride: 'marked' },
  },
};

export const HEAD_HYGIENE_CONFIG = {
  default: HEAD_PROFILE,
  groups: {
    hair: {
      regions: ['hair'],
      profile: HAIR_PROFILE,
    },
  },
};

export const HEAD_HYGIENE_MODIFIERS = flattenHygieneData(HEAD_HYGIENE_CONFIG, [...HEAD_REGIONS]);

/**
 * Grouped defaults for head regions.
 */
export const HEAD_SCENT_DATA = {
  head: {
    main: {
      head: { ...NEUTRAL, intensity: 0.2 },
      face: CLEAN_SKIN,
      forehead: CLEAN_SKIN,
    },
    eyes: {
      leftEye: CLEAN_SKIN,
      rightEye: CLEAN_SKIN,
    },
    nose: {
      nose: CLEAN_SKIN,
    },
    cheeks: {
      leftCheek: CLEAN_SKIN,
      rightCheek: CLEAN_SKIN,
    },
    chin: {
      chin: CLEAN_SKIN,
    },
    mouth: {
      mouth: { primary: 'neutral', intensity: 0.15 },
    },
    hair: {
      hair: { primary: 'clean hair', notes: ['shampoo'], intensity: 0.3 },
    },
    ears: {
      ears: { ...CLEAN_SKIN, intensity: 0.15 },
      leftEar: { ...CLEAN_SKIN, intensity: 0.15 },
      rightEar: { ...CLEAN_SKIN, intensity: 0.15 },
    },
  },
};

export const HEAD_DEFAULT_SCENTS: Partial<Record<HeadRegion, RegionScent>> = {
  ...HEAD_SCENT_DATA.head.main,
  ...HEAD_SCENT_DATA.head.eyes,
  ...HEAD_SCENT_DATA.head.nose,
  ...HEAD_SCENT_DATA.head.cheeks,
  ...HEAD_SCENT_DATA.head.chin,
  ...HEAD_SCENT_DATA.head.mouth,
  ...HEAD_SCENT_DATA.head.hair,
  ...HEAD_SCENT_DATA.head.ears,
};
