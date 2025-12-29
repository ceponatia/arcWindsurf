export const LEFT_TOES = [
  'leftBigToe',
  'leftSecondToe',
  'leftMiddleToe',
  'leftFourthToe',
  'leftLittleToe',
] as const;

export const RIGHT_TOES = [
  'rightBigToe',
  'rightSecondToe',
  'rightMiddleToe',
  'rightFourthToe',
  'rightLittleToe',
] as const;

export const TOE_REGIONS = [...LEFT_TOES, ...RIGHT_TOES] as const;
