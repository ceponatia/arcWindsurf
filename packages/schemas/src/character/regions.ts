// ============================================================================
// Body Region Taxonomy
// ============================================================================
// Defines the canonical body regions used throughout the system.
// This is the single source of truth for all body region references.
//
// Used by:
// - Sensory data mapping (scents, textures, temperatures)
// - Appearance attribute configuration (UI regions)
// - Equipment slot mapping (what clothing covers what)
// - Intent routing (resolving player queries about body parts)
//
// Note: Equipment slot mapping (body region → clothing slots) is handled
// separately in the governor package's equipment-resolver.ts to keep
// character schemas decoupled from item schemas.
// ============================================================================

import { BODY_REGIONS, type BodyRegion, type BodySide } from '../body-regions/index.js';

export { BODY_REGIONS };
export type { BodyRegion };

/**
 * Body region aliases map natural language references to canonical regions.
 * Used by intent detection and agents to resolve player input.
 *
 * Includes:
 * - Body part synonyms (e.g., "skull" → "head", "tummy" → "torso")
 * - Equipment references (e.g., "shoes" → "feet", "gloves" → "hands")
 *
 * Example: "I look at her shoes" → resolves to 'feet' region
 * Example: "I smell his hair" → resolves to 'hair' region
 * Example: "What is she wearing on her hands?" → resolves to 'hands' region
 */
export const BODY_REGION_ALIASES: Record<string, BodyRegion> = {
  // Head region aliases
  skull: 'head',
  scalp: 'hair',
  locks: 'hair',
  tresses: 'hair',
  mane: 'hair',

  // Face region aliases
  visage: 'face',
  countenance: 'face',
  features: 'face',

  // Ear aliases (side is applied in resolveBodyRegion)
  ear: 'ears',
  earlobe: 'ears',
  earlobes: 'ears',

  // Mouth aliases
  lips: 'mouth',
  tongue: 'mouth',
  teeth: 'mouth',

  // Head detail aliases
  brow: 'forehead',
  forehead: 'forehead',
  chin: 'chin',
  cheek: 'face',
  cheeks: 'face',
  nose: 'nose',
  eye: 'face',
  eyes: 'face',

  // Neck aliases
  nape: 'nape',

  // Throat aliases
  adams_apple: 'throat',
  larynx: 'throat',

  // Chest aliases
  pecs: 'chest',
  pectorals: 'chest',

  // Breast aliases (side is applied in resolveBodyRegion)
  breast: 'breasts',
  bosom: 'breasts',
  bust: 'breasts',

  // Nipple aliases (side is applied in resolveBodyRegion)
  nipple: 'nipples',
  areola: 'nipples',
  areolas: 'nipples',

  // Back aliases
  spine: 'spine',
  upper_back: 'upperBack',

  // Lower back aliases
  lower_back: 'lowerBack',
  lumbar: 'lowerBack',

  // Torso aliases
  body: 'torso',
  trunk: 'torso',
  ribs: 'torso',
  side: 'leftSide',
  sides: 'leftSide',

  // Abdomen aliases
  stomach: 'abdomen',
  belly: 'abdomen',
  midriff: 'abdomen',
  abs: 'abdomen',

  // Navel aliases
  belly_button: 'navel',
  bellybutton: 'navel',
  umbilicus: 'navel',

  // Armpit aliases (side is applied in resolveBodyRegion)
  armpit: 'armpits',
  underarm: 'armpits',
  underarms: 'armpits',
  axilla: 'armpits',

  // Back aliases (additional)
  shoulderblades: 'upperBack',

  // Shoulder aliases (side is applied in resolveBodyRegion)
  shoulder: 'shoulders',

  // Arm aliases (side is applied in resolveBodyRegion)
  arm: 'arms',
  bicep: 'arms',
  biceps: 'arms',
  forearm: 'arms',
  forearms: 'arms',
  elbow: 'arms',
  elbows: 'arms',
  wrist: 'arms',
  wrists: 'arms',

  // Hand aliases (side is applied in resolveBodyRegion)
  hand: 'hands',
  palm: 'hands',
  palms: 'hands',
  fingers: 'hands',
  finger: 'hands',
  knuckles: 'hands',
  nails: 'hands',
  fingernails: 'hands',

  // Waist/hip aliases
  hip: 'hips',
  pelvis: 'pelvis',
  lap: 'pelvis',

  // Groin aliases
  crotch: 'groin',
  pubic: 'groin',

  // Buttocks aliases (side is applied in resolveBodyRegion)
  butt: 'buttocks',
  ass: 'buttocks',
  rear: 'buttocks',
  behind: 'buttocks',
  glutes: 'buttocks',
  bottom: 'buttocks',

  // Anus aliases
  asshole: 'anus',
  rectum: 'anus',

  // Penis aliases
  cock: 'penis',
  dick: 'penis',
  shaft: 'penis',

  // Vagina aliases
  pussy: 'vagina',
  vulva: 'vagina',
  labia: 'vagina',

  // Leg aliases (side is applied in resolveBodyRegion)
  leg: 'legs',

  // Thigh aliases
  thigh: 'thighs',

  // Knee aliases
  knee: 'knees',
  kneecap: 'knees',
  kneecaps: 'knees',

  // Calf/shin aliases
  calf: 'calves',
  shin: 'calves',
  shins: 'calves',

  // Ankle aliases
  ankle: 'ankles',

  // Foot aliases
  foot: 'feet',
  sole: 'feet',
  soles: 'feet',
  heel: 'feet',
  heels: 'feet',
  arch: 'feet',
  arches: 'feet',
  instep: 'feet',

  // Toe aliases
  toe: 'toes',
  big_toe: 'toes',
  bigtoe: 'toes',

  // Equipment-based aliases (item → body region it covers)
  shoes: 'feet',
  boots: 'feet',
  sandals: 'feet',
  socks: 'feet',
  footwear: 'feet',
  gloves: 'hands',
  gauntlets: 'hands',
  mittens: 'hands',
  hat: 'head',
  helmet: 'head',
  cap: 'head',
  hood: 'head',
  crown: 'head',
  mask: 'face',
  glasses: 'face',
  shirt: 'torso',
  jacket: 'torso',
  coat: 'torso',
  dress: 'torso',
  vest: 'torso',
  blouse: 'torso',
  sweater: 'torso',
  pants: 'legs',
  trousers: 'legs',
  skirt: 'legs',
  shorts: 'legs',
  leggings: 'legs',
  jeans: 'legs',
  belt: 'waist',
  necklace: 'neck',
  choker: 'neck',
  scarf: 'neck',
  collar: 'neck',
};

function extractSide(normalized: string): { side: BodySide | undefined; value: string } {
  const cleaned = normalized.replace(/[_-]+/g, ' ').trim();

  const prefix = /^(left|right)\s+(.+)$/.exec(cleaned);
  if (prefix) {
    return { side: prefix[1] as BodySide, value: prefix[2] ?? '' };
  }

  const suffix = /^(.+)\s+(left|right)$/.exec(cleaned);
  if (suffix) {
    return { side: suffix[2] as BodySide, value: suffix[1] ?? '' };
  }

  return { side: undefined, value: cleaned };
}

function applySideToRegion(region: BodyRegion, side: BodySide | undefined): BodyRegion {
  if (!side) return region;

  const sideMap: Partial<Record<BodyRegion, { left: BodyRegion; right: BodyRegion }>> = {
    ears: { left: 'leftEar', right: 'rightEar' },
    shoulders: { left: 'leftShoulder', right: 'rightShoulder' },
    breasts: { left: 'leftBreast', right: 'rightBreast' },
    nipples: { left: 'leftNipple', right: 'rightNipple' },
    armpits: { left: 'leftArmpit', right: 'rightArmpit' },
    arms: { left: 'leftArm', right: 'rightArm' },
    hands: { left: 'leftHand', right: 'rightHand' },
    hips: { left: 'leftHip', right: 'rightHip' },
    buttocks: { left: 'leftButtock', right: 'rightButtock' },
    legs: { left: 'leftLeg', right: 'rightLeg' },
    thighs: { left: 'leftThigh', right: 'rightThigh' },
    knees: { left: 'leftKnee', right: 'rightKnee' },
    calves: { left: 'leftCalf', right: 'rightCalf' },
    ankles: { left: 'leftAnkle', right: 'rightAnkle' },
    feet: { left: 'leftFoot', right: 'rightFoot' },
    toes: { left: 'leftBigToe', right: 'rightBigToe' },
  };

  const mapped = sideMap[region];
  if (mapped) {
    return side === 'left' ? mapped.left : mapped.right;
  }

  if (side === 'left' && region.startsWith('right')) {
    const candidate = `left${region.slice('right'.length)}`;
    return candidate as BodyRegion;
  }

  if (side === 'right' && region.startsWith('left')) {
    const candidate = `right${region.slice('left'.length)}`;
    return candidate as BodyRegion;
  }

  return region;
}

/**
 * Default body region for general/unspecified references.
 * When a player says "I smell them" without specifying a body part,
 * this region is used as the default.
 */
export const DEFAULT_BODY_REGION: BodyRegion = 'torso';

/**
 * Resolve a body part reference to a canonical region.
 * Returns the default region if no match is found.
 *
 * @param reference - The body part reference from player input
 * @param defaultRegion - Override for the default region (defaults to 'torso')
 */
export function resolveBodyRegion(
  reference: string | undefined | null,
  defaultRegion: BodyRegion = DEFAULT_BODY_REGION
): BodyRegion {
  if (!reference) {
    return defaultRegion;
  }

  const normalized = reference.toLowerCase().trim();
  const { side, value } = extractSide(normalized);

  // Check if it's already a canonical region
  if (BODY_REGIONS.includes(normalized as BodyRegion)) {
    return normalized as BodyRegion;
  }

  // Check if the side-stripped value is a canonical region
  if (BODY_REGIONS.includes(value as BodyRegion)) {
    return applySideToRegion(value as BodyRegion, side);
  }

  // Check aliases
  const aliased = BODY_REGION_ALIASES[value];
  if (aliased) {
    return applySideToRegion(aliased, side);
  }

  // Fuzzy match: check if any alias contains the reference or vice versa
  for (const [alias, region] of Object.entries(BODY_REGION_ALIASES)) {
    if (alias.includes(value) || value.includes(alias)) {
      return applySideToRegion(region, side);
    }
  }

  return defaultRegion;
}

/**
 * Check if a string is a valid body region or alias.
 */
export function isBodyReference(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  const { value: stripped } = extractSide(normalized);
  return (
    BODY_REGIONS.includes(stripped as BodyRegion) ||
    stripped in BODY_REGION_ALIASES ||
    BODY_REGIONS.includes(normalized as BodyRegion)
  );
}
