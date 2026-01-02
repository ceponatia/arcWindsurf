import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { NEUTRAL_FAINT } from '../constants.js';
import { GROIN_REGIONS } from './regions.js';
import type { RegionScent } from '../sensory-types.js';

type GroinRegion = (typeof GROIN_REGIONS)[number];

const GROIN_PROFILE: HygieneProfile = {
  0: {
    scent: { primary: 'fresh', intensity: 0.1 },
    texture: { moisture: 'dry' },
  },
  1: {
    scent: { primary: 'warm musk', intensity: 0.25 },
    texture: { moisture: 'normal', temperature: 'warm' },
  },
  2: {
    scent: { primary: 'stale musk', intensity: 0.45 },
    texture: { moisture: 'damp', temperature: 'warm' },
  },
  3: {
    scent: { primary: 'strong musk', intensity: 0.6 },
    texture: { moisture: 'damp', temperature: 'warm' },
    flavor: { primary: 'salty' },
    visual: { descriptionAppend: 'glistening slightly' },
  },
  4: {
    scent: { primary: 'pungent', intensity: 0.75 },
    texture: { moisture: 'wet', temperature: 'warm' },
    flavor: { primary: 'salty', intensity: 0.7 },
    visual: { descriptionAppend: 'sweaty' },
  },
  5: {
    scent: { primary: 'overpowering', intensity: 0.9 },
    texture: { moisture: 'wet', primary: 'sticky' },
    flavor: { primary: 'bitter', intensity: 0.9 },
    visual: { descriptionAppend: 'filthy', featuresAdd: ['grime'] },
  },
  6: {
    scent: { primary: 'putrid', intensity: 1.0 },
    texture: { moisture: 'wet', primary: 'slimy' },
    flavor: { primary: 'foul', intensity: 1.0 },
    visual: { descriptionAppend: 'covered in filth', skinConditionOverride: 'marked' },
  },
};

const BUTTOCKS_PROFILE: HygieneProfile = {
  0: {
    scent: { primary: 'fresh', intensity: 0.1 },
    texture: { moisture: 'dry', primary: 'smooth' },
  },
  1: {
    scent: { primary: 'stale skin', intensity: 0.25 },
    texture: { moisture: 'normal' },
  },
  2: {
    scent: { primary: 'sweaty skin', intensity: 0.45 },
    texture: { moisture: 'damp' },
  },
  3: {
    scent: { primary: 'strong sweat', intensity: 0.6 },
    texture: { moisture: 'damp', temperature: 'warm' },
    visual: { descriptionAppend: 'slightly glistening' },
  },
  4: {
    scent: { primary: 'pungent', intensity: 0.75 },
    texture: { moisture: 'wet', temperature: 'warm' },
    visual: { descriptionAppend: 'sweaty' },
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

export const GROIN_HYGIENE_CONFIG = {
  default: GROIN_PROFILE,
  groups: {
    buttocks: {
      regions: ['buttocks', 'leftButtock', 'rightButtock'],
      profile: BUTTOCKS_PROFILE,
    },
  },
};

export const GROIN_HYGIENE_MODIFIERS = flattenHygieneData(GROIN_HYGIENE_CONFIG, [...GROIN_REGIONS]);

export const GROIN_DEFAULT_SCENTS: Partial<Record<GroinRegion, RegionScent>> = {
  groin: NEUTRAL_FAINT,
  buttocks: NEUTRAL_FAINT,
  leftButtock: NEUTRAL_FAINT,
  rightButtock: NEUTRAL_FAINT,
  anus: NEUTRAL_FAINT,
  penis: NEUTRAL_FAINT,
  vagina: NEUTRAL_FAINT,
};
