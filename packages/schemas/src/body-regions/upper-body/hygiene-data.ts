import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { CLEAN_SKIN } from '../constants.js';
import { UPPER_BODY_REGIONS } from './regions.js';
import type { RegionScent } from '../sensory-types.js';

type UpperBodyRegion = (typeof UPPER_BODY_REGIONS)[number];

const UPPER_BODY_PROFILE: HygieneProfile = {
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

export const UPPER_BODY_HYGIENE_CONFIG = {
  default: UPPER_BODY_PROFILE,
};

export const UPPER_BODY_HYGIENE_MODIFIERS = flattenHygieneData(UPPER_BODY_HYGIENE_CONFIG, [
  ...UPPER_BODY_REGIONS,
]);

export const UPPER_BODY_DEFAULT_SCENTS: Partial<Record<UpperBodyRegion, RegionScent>> = {
  shoulders: CLEAN_SKIN,
  leftShoulder: CLEAN_SKIN,
  rightShoulder: CLEAN_SKIN,
  chest: CLEAN_SKIN,
  leftPectoral: CLEAN_SKIN,
  rightPectoral: CLEAN_SKIN,
  breasts: CLEAN_SKIN,
  leftBreast: CLEAN_SKIN,
  rightBreast: CLEAN_SKIN,
  nipples: CLEAN_SKIN,
  leftNipple: CLEAN_SKIN,
  rightNipple: CLEAN_SKIN,
  upperBack: CLEAN_SKIN,
  back: CLEAN_SKIN,
  spine: CLEAN_SKIN,
  lowerBack: CLEAN_SKIN,
};
