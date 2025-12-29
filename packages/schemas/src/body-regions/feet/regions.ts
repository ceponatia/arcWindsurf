import { TOE_REGIONS } from './toes.js';

export const FEET_REGIONS = [
  'feet',
  'leftAnkle',
  'rightAnkle',
  'leftFoot',
  'rightFoot',
  'leftHeel',
  'rightHeel',
  'leftSole',
  'rightSole',
  'leftArch',
  'rightArch',
  'toes',
  ...TOE_REGIONS,
] as const;
