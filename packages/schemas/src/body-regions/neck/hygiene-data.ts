import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { CLEAN_SKIN } from '../constants.js';
import { NECK_REGIONS } from './regions.js';
import type { RegionScent } from '../sensory-types.js';

type NeckRegion = (typeof NECK_REGIONS)[number];

const NECK_PROFILE: HygieneProfile = {
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

export const NECK_HYGIENE_CONFIG = {
  default: NECK_PROFILE,
};

export const NECK_HYGIENE_MODIFIERS = flattenHygieneData(NECK_HYGIENE_CONFIG, [...NECK_REGIONS]);

/**
 * Grouped defaults for neck regions.
 */
export const NECK_SCENT_DATA = {
  neck: {
    main: {
      neck: CLEAN_SKIN,
      nape: CLEAN_SKIN,
      throat: CLEAN_SKIN,
    },
  },
};

export const NECK_DEFAULT_SCENTS: Partial<Record<NeckRegion, RegionScent>> = {
  ...NECK_SCENT_DATA.neck.main,
};
