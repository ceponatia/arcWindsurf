export const REGION_HIERARCHY: Record<string, string[]> = {
  head: ['face', 'hair', 'eyes', 'ears', 'nose', 'mouth', 'cheeks', 'chin'],
  neck: ['throat'],
  chest: ['breasts', 'nipples', 'pecs', 'upperBack', 'shoulders'],
  torso: ['chest', 'abdomen', 'back', 'sides', 'hips', 'waist'],
  arms: ['shoulders', 'armpits', 'upperArms', 'elbows', 'forearms', 'wrists'],
  hands: ['palms', 'fingers'],
  legs: ['thighs', 'knees', 'calves', 'shins', 'ankles'],
  feet: ['heels', 'soles', 'toes', 'arches'],
  groin: ['buttocks', 'penis', 'vagina'],
};

export const REGION_GROUPS: Record<string, string[]> = {
  hips: ['leftHip', 'rightHip'],
  sides: ['leftSide', 'rightSide'],
  arms: ['leftArm', 'rightArm'],
  legs: ['leftLeg', 'rightLeg'],
  hands: ['leftHand', 'rightHand'],
  feet: ['leftFoot', 'rightFoot'],
  breasts: ['leftBreast', 'rightBreast'],
  nipples: ['leftNipple', 'rightNipple'],
  eyes: ['leftEye', 'rightEye'],
  ears: ['leftEar', 'rightEar'],
  cheeks: ['leftCheek', 'rightCheek'],
  buttocks: ['leftButtock', 'rightButtock'],
  shoulders: ['leftShoulder', 'rightShoulder'],
  armpits: ['leftArmpit', 'rightArmpit'],
  upperArms: ['leftUpperArm', 'rightUpperArm'],
  elbows: ['leftElbow', 'rightElbow'],
  forearms: ['leftForearm', 'rightForearm'],
  wrists: ['leftWrist', 'rightWrist'],
  palms: ['leftPalm', 'rightPalm'],
  fingers: ['leftFingers', 'rightFingers'],
  thighs: ['leftThigh', 'rightThigh'],
  knees: ['leftKnee', 'rightKnee'],
  calves: ['leftCalf', 'rightCalf'],
  shins: ['leftShin', 'rightShin'],
  ankles: ['leftAnkle', 'rightAnkle'],
  heels: ['leftHeel', 'rightHeel'],
  soles: ['leftSole', 'rightSole'],
  arches: ['leftArch', 'rightArch'],
  pecs: ['leftPectoral', 'rightPectoral'],
};

export const SUB_REGION_LABELS: Record<string, string> = {
  face: 'Face',
  hair: 'Hair',
  eyes: 'Eyes',
  ears: 'Ears',
  nose: 'Nose',
  mouth: 'Mouth',
  cheeks: 'Cheeks',
  chin: 'Chin',
  throat: 'Throat',
  breasts: 'Breasts',
  nipples: 'Nipples',
  pecs: 'Pecs',
  upperBack: 'Upper Back',
  shoulders: 'Shoulders',
  abdomen: 'Abdomen',
  back: 'Back',
  sides: 'Sides',
  hips: 'Hips',
  waist: 'Waist',
  armpits: 'Armpits',
  upperArms: 'Upper Arms',
  elbows: 'Elbows',
  forearms: 'Forearms',
  wrists: 'Wrists',
  palms: 'Palms',
  fingers: 'Fingers',
  thighs: 'Thighs',
  knees: 'Knees',
  calves: 'Calves',
  shins: 'Shins',
  ankles: 'Ankles',
  heels: 'Heels',
  soles: 'Soles',
  toes: 'Toes',
  arches: 'Arches',
  buttocks: 'Buttocks',
  penis: 'Penis',
  vagina: 'Vagina',
};

export const RACE_EXCLUSIONS: Record<string, string[]> = {
  golem: ['penis', 'vagina', 'hair'],
  slug: ['legs', 'arms', 'hands', 'feet'],
};

export const GENDER_EXCLUSIONS: Record<string, string[]> = {
  male: ['vagina', 'breasts'],
  female: ['penis'],
};

export const getFilteredHierarchy = (
  race = 'human',
  gender = 'other'
): Record<string, string[]> => {
  const raceKey = race.toLowerCase();
  const genderKey = gender.toLowerCase();

  const raceExclusions = RACE_EXCLUSIONS[raceKey] ?? [];
  const genderExclusions = GENDER_EXCLUSIONS[genderKey] ?? [];
  const allExclusions = new Set([...raceExclusions, ...genderExclusions]);

  const filtered: Record<string, string[]> = {};

  Object.entries(REGION_HIERARCHY).forEach(([region, subRegions]) => {
    // If the main region itself is excluded (e.g. 'legs' for slug)
    if (allExclusions.has(region)) return;

    const filteredSubRegions = subRegions.filter((sub) => !allExclusions.has(sub));

    if (filteredSubRegions.length > 0) {
      filtered[region] = filteredSubRegions;
    }
  });

  return filtered;
};
