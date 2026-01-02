import type { BodyRegion } from '../regions.js';
import { TOE_REGIONS } from '../../body-regions/index.js';

/**
 * Tiered scent defaults.
 *
 * - universal: always safe to default without prompting
 * - hygieneModulated: defaults exist, but descriptions should be modified by hygiene
 * - customizable: defaults are minimal; UI may prompt the user to override
 */
export const SCENT_TIERS = {
  universal: [
    // Head
    'head',
    'face',
    'forehead',
    'leftEye',
    'rightEye',
    'nose',
    'leftCheek',
    'rightCheek',
    'chin',
    'ears',
    'leftEar',
    'rightEar',

    // Neck
    'neck',
    'nape',
    'throat',

    // Upper body
    'shoulders',
    'leftShoulder',
    'rightShoulder',
    'chest',
    'leftPectoral',
    'rightPectoral',
    'upperBack',
    'back',
    'spine',
    'lowerBack',

    // Torso
    'torso',
    'abdomen',
    'navel',
    'leftSide',
    'rightSide',

    // Limbs
    'arms',
    'leftArm',
    'rightArm',
    'hands',
    'leftHand',
    'rightHand',
    'legs',
    'leftLeg',
    'rightLeg',
    'thighs',
    'leftThigh',
    'rightThigh',
    'knees',
    'leftKnee',
    'rightKnee',
    'calves',
    'leftCalf',
    'rightCalf',
    'leftShin',
    'rightShin',
    'ankles',
    'leftAnkle',
    'rightAnkle',
    'feet',
    'leftFoot',
    'rightFoot',
    'leftHeel',
    'rightHeel',
    'leftSole',
    'rightSole',
    'leftArch',
    'rightArch',
    'toes',
  ],
  hygieneModulated: [
    'hair',
    'armpits',
    'leftArmpit',
    'rightArmpit',
    'groin',
    'buttocks',
    'leftButtock',
    'rightButtock',
    'feet',
    'leftFoot',
    'rightFoot',
    'toes',
    ...TOE_REGIONS,
  ],
  customizable: [
    'mouth',
    'breasts',
    'leftBreast',
    'rightBreast',
    'nipples',
    'leftNipple',
    'rightNipple',
    'waist',
    'hips',
    'leftHip',
    'rightHip',
    'anus',
    'penis',
    'vagina',
    'pelvis',
  ],
} as const satisfies Record<string, readonly BodyRegion[]>;

export type ScentTier = keyof typeof SCENT_TIERS;
