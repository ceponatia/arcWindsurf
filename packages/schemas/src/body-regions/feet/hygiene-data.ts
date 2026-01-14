import { setRecord } from '../../shared/record-helpers.js';
import type { HygieneProfile } from '../../state/hygiene-types.js';
import { flattenHygieneData } from '../../state/hygiene-types.js';
import { CLEAN_SKIN, NEUTRAL_FAINT } from '../constants.js';
import { FEET_REGIONS } from './regions.js';
import { TOE_REGIONS } from './toes.js';
import type { RegionScent } from '../sensory-types.js';

type FeetRegion = (typeof FEET_REGIONS)[number];

// Define profiles
const CLEAN_FEET_PROFILE: HygieneProfile = {
  0: {
    scent: { primary: 'fresh', intensity: 0.1 },
    texture: { moisture: 'dry', primary: 'smooth' },
    visual: { descriptionAppend: 'clean' },
  },
  1: {
    scent: { primary: 'faintly sweaty', intensity: 0.25 },
    texture: { moisture: 'normal' },
  },
  2: {
    scent: { primary: 'stale sweat', intensity: 0.45 },
    texture: { moisture: 'damp' },
  },
  3: {
    scent: { primary: 'strong foot odor', intensity: 0.65 },
    texture: { moisture: 'damp', temperature: 'warm' },
    visual: { descriptionAppend: 'slightly glistening' },
  },
  4: {
    scent: { primary: 'pungent foot odor', intensity: 0.8 },
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

// Toes might get sweatier/dirtier faster or have different modifiers
// For now reusing the same profile but could be customized
const TOE_PROFILE: HygieneProfile = {
  ...CLEAN_FEET_PROFILE,
  // Customizations for toes if needed
};

export const FEET_HYGIENE_CONFIG = {
  default: CLEAN_FEET_PROFILE,
  groups: {
    toes: {
      regions: ['toes', ...TOE_REGIONS],
      profile: TOE_PROFILE,
    },
  },
};

export const FEET_HYGIENE_MODIFIERS = flattenHygieneData(FEET_HYGIENE_CONFIG, [...FEET_REGIONS]);

const TOE_DEFAULTS = TOE_REGIONS.reduce(
  (acc, region) => {
    setRecord(acc, region, NEUTRAL_FAINT);
    return acc;
  },
  {} as Record<string, RegionScent>
);

/**
 * Grouped defaults for feet regions.
 * Granular regions like toes and soles are grouped under the parent 'feet'.
 */
export const FEET_SCENT_DATA = {
  feet: {
    main: {
      feet: NEUTRAL_FAINT,
      leftFoot: NEUTRAL_FAINT,
      rightFoot: NEUTRAL_FAINT,
    },
    heels: {
      leftHeel: NEUTRAL_FAINT,
      rightHeel: NEUTRAL_FAINT,
    },
    soles: {
      leftSole: NEUTRAL_FAINT,
      rightSole: NEUTRAL_FAINT,
    },
    arches: {
      leftArch: NEUTRAL_FAINT,
      rightArch: NEUTRAL_FAINT,
    },
    toes: {
      toes: NEUTRAL_FAINT,
      ...TOE_DEFAULTS,
    },
  },
};

export const FEET_DEFAULT_SCENTS: Partial<Record<FeetRegion, RegionScent>> = {
  ...FEET_SCENT_DATA.feet.main,
  ...FEET_SCENT_DATA.feet.heels,
  ...FEET_SCENT_DATA.feet.soles,
  ...FEET_SCENT_DATA.feet.arches,
  ...FEET_SCENT_DATA.feet.toes,
};
