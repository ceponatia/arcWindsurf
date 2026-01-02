import type { BodyMapDefinition } from './types.js';

const HUMAN_MALE_PATHS = [
  {
    region: 'neck' as const,
    d: 'M88 55 Q 100 65, 112 55 L 112 75 Q 100 85, 88 75 Z',
  },
  {
    region: 'head' as const,
    d: 'M100 10 C 85 10, 75 25, 75 40 C 75 58, 85 65, 100 65 C 115 65, 125 58, 125 40 C 125 25, 115 10, 100 10 Z',
  },
  {
    region: 'chest' as const,
    d: 'M 88 75 Q 100 85, 112 75 C 125 75, 135 80, 132 110 L 125 170 Q 100 180, 75 170 L 68 110 C 65 80, 75 75, 88 75 Z',
  },
  {
    region: 'groin' as const,
    d: 'M 75 170 Q 100 180, 125 170 C 128 185, 130 200, 125 215 L 100 230 L 75 215 C 70 200, 72 185, 75 170 Z',
  },
  {
    region: 'leftArm' as const,
    d: 'M 68 80 C 60 75, 50 80, 45 95 L 35 160 C 32 175, 38 185, 45 185 L 55 185 C 62 185, 65 175, 62 160 L 55 95 C 52 85, 60 82, 68 80 Z',
  },
  {
    region: 'rightArm' as const,
    d: 'M 132 80 C 140 75, 150 80, 155 95 L 165 160 C 168 175, 162 185, 155 185 L 145 185 C 138 185, 135 175, 138 160 L 145 95 C 148 85, 140 82, 132 80 Z',
  },
  {
    region: 'leftHand' as const,
    d: 'M 45 185 C 35 185, 30 200, 32 215 C 34 225, 42 230, 50 230 C 58 230, 66 225, 68 215 C 70 200, 65 185, 55 185 Z',
  },
  {
    region: 'rightHand' as const,
    d: 'M 155 185 C 165 185, 170 200, 168 215 C 166 225, 158 230, 150 230 C 142 230, 134 225, 132 215 C 130 200, 135 185, 145 185 Z',
  },
  {
    region: 'leftLeg' as const,
    d: 'M 75 215 Q 85 235, 100 230 L 95 300 C 92 330, 90 350, 85 370 L 65 370 C 60 350, 58 330, 65 300 L 70 235 Q 72 225, 75 215 Z',
  },
  {
    region: 'rightLeg' as const,
    d: 'M 125 215 Q 115 235, 100 230 L 105 300 C 108 330, 110 350, 115 370 L 135 370 C 140 350, 142 330, 135 300 L 130 235 Q 128 225, 125 215 Z',
  },
  {
    region: 'leftFoot' as const,
    d: 'M 65 370 L 85 370 C 90 380, 92 390, 85 400 C 75 405, 50 405, 40 400 C 35 390, 55 380, 65 370 Z',
  },
  {
    region: 'rightFoot' as const,
    d: 'M 135 370 L 115 370 C 110 380, 108 390, 115 400 C 125 405, 150 405, 160 400 C 165 390, 145 380, 135 370 Z',
  },
];

const HUMAN_FEMALE_PATHS = [
  {
    region: 'neck' as const,
    d: 'M90 55 Q 100 62, 110 55 L 110 75 Q 100 82, 90 75 Z',
  },
  {
    region: 'head' as const,
    d: 'M100 10 C 88 10, 78 25, 78 40 C 78 55, 85 65, 100 65 C 115 65, 122 55, 122 40 C 122 25, 112 10, 100 10 Z',
  },
  {
    region: 'breasts' as const,
    d: 'M 90 75 Q 100 82, 110 75 C 125 78, 138 95, 135 115 Q 100 125, 65 115 C 62 95, 75 78, 90 75 Z',
  },
  {
    region: 'abdomen' as const,
    d: 'M 65 115 Q 100 125, 135 115 C 135 135, 135 155, 128 165 Q 100 175, 72 165 C 65 155, 65 135, 65 115 Z',
  },
  {
    region: 'groin' as const,
    d: 'M 72 165 Q 100 175, 128 165 C 135 180, 135 200, 125 215 L 100 230 L 75 215 C 65 200, 65 180, 72 165 Z',
  },
  {
    region: 'leftArm' as const,
    d: 'M 65 90 C 58 88, 50 90, 45 100 L 38 160 C 36 175, 40 185, 48 185 L 58 185 C 65 185, 68 175, 66 160 L 58 100 C 56 92, 60 90, 65 90 Z',
  },
  {
    region: 'rightArm' as const,
    d: 'M 135 90 C 142 88, 150 90, 155 100 L 162 160 C 164 175, 160 185, 152 185 L 142 185 C 135 185, 132 175, 134 160 L 142 100 C 144 92, 140 90, 135 90 Z',
  },
  {
    region: 'leftHand' as const,
    d: 'M 48 185 C 40 185, 35 200, 37 215 C 39 225, 45 230, 53 230 C 61 230, 67 225, 69 215 C 71 200, 66 185, 58 185 Z',
  },
  {
    region: 'rightHand' as const,
    d: 'M 152 185 C 160 185, 165 200, 163 215 C 161 225, 155 230, 147 230 C 139 230, 133 225, 131 215 C 129 200, 134 185, 142 185 Z',
  },
  {
    region: 'leftLeg' as const,
    d: 'M 75 215 Q 82 235, 100 230 L 95 300 C 93 330, 92 350, 88 370 L 68 370 C 64 350, 60 330, 62 300 L 68 235 Q 70 225, 75 215 Z',
  },
  {
    region: 'rightLeg' as const,
    d: 'M 125 215 Q 118 235, 100 230 L 105 300 C 107 330, 108 350, 112 370 L 132 370 C 136 350, 140 330, 138 300 L 132 235 Q 130 225, 125 215 Z',
  },
  {
    region: 'leftFoot' as const,
    d: 'M 68 370 L 88 370 C 92 380, 94 390, 88 400 C 78 405, 55 405, 45 400 C 40 390, 58 380, 68 370 Z',
  },
  {
    region: 'rightFoot' as const,
    d: 'M 132 370 L 112 370 C 108 380, 106 390, 112 400 C 122 405, 145 405, 155 400 C 160 390, 142 380, 132 370 Z',
  },
];

export const HUMAN_MALE_DEF: BodyMapDefinition = {
  id: 'human-male',
  viewBox: '0 0 200 420',
  paths: HUMAN_MALE_PATHS,
};

export const HUMAN_FEMALE_DEF: BodyMapDefinition = {
  id: 'human-female',
  viewBox: '0 0 200 420',
  paths: HUMAN_FEMALE_PATHS,
};

export const HUMAN_NEUTRAL_DEF: BodyMapDefinition = {
  id: 'human-neutral',
  viewBox: '0 0 200 420',
  paths: HUMAN_MALE_PATHS,
};
