import type { BodyMapDefinition } from './types.js';

// Base Elf Male Paths (Narrower than Human)
const ELF_MALE_PATHS = [
  {
    region: 'neck' as const,
    d: 'M90 55 Q 100 65, 110 55 L 110 75 Q 100 85, 90 75 Z',
  },
  {
    region: 'head' as const,
    // Narrower head
    d: 'M100 10 C 88 10, 80 25, 80 40 C 80 58, 88 65, 100 65 C 112 65, 120 58, 120 40 C 120 25, 112 10, 100 10 Z',
  },
  {
    region: 'chest' as const,
    // Narrower torso
    d: 'M 90 75 Q 100 85, 110 75 C 120 75, 128 80, 126 110 L 120 170 Q 100 180, 80 170 L 74 110 C 72 80, 80 75, 90 75 Z',
  },
  {
    region: 'groin' as const,
    // Narrower pelvis
    d: 'M 80 170 Q 100 180, 120 170 C 122 185, 124 200, 120 215 L 100 230 L 80 215 C 76 200, 78 185, 80 170 Z',
  },
  {
    region: 'leftArm' as const,
    // Shifted in +2
    d: 'M 70 80 C 62 75, 52 80, 47 95 L 37 160 C 34 175, 40 185, 47 185 L 57 185 C 64 185, 67 175, 64 160 L 57 95 C 54 85, 62 82, 70 80 Z',
  },
  {
    region: 'rightArm' as const,
    // Shifted in -2
    d: 'M 130 80 C 138 75, 148 80, 153 95 L 163 160 C 166 175, 160 185, 153 185 L 143 185 C 136 185, 133 175, 136 160 L 143 95 C 146 85, 138 82, 130 80 Z',
  },
  {
    region: 'leftHand' as const,
    // Shifted in +2
    d: 'M 47 185 C 37 185, 32 200, 34 215 C 36 225, 44 230, 52 230 C 60 230, 68 225, 70 215 C 72 200, 67 185, 57 185 Z',
  },
  {
    region: 'rightHand' as const,
    // Shifted in -2
    d: 'M 153 185 C 163 185, 168 200, 166 215 C 164 225, 156 230, 148 230 C 140 230, 132 225, 130 215 C 128 200, 133 185, 143 185 Z',
  },
  {
    region: 'leftLeg' as const,
    // Shifted in +2
    d: 'M 77 215 Q 87 235, 100 230 L 97 300 C 94 330, 92 350, 87 370 L 67 370 C 62 350, 60 330, 67 300 L 72 235 Q 74 225, 77 215 Z',
  },
  {
    region: 'rightLeg' as const,
    // Shifted in -2
    d: 'M 123 215 Q 113 235, 100 230 L 103 300 C 106 330, 108 350, 113 370 L 133 370 C 138 350, 140 330, 133 300 L 128 235 Q 126 225, 123 215 Z',
  },
  {
    region: 'leftFoot' as const,
    // Shifted in +2
    d: 'M 67 370 L 87 370 C 92 380, 94 390, 87 400 C 77 405, 52 405, 42 400 C 37 390, 57 380, 67 370 Z',
  },
  {
    region: 'rightFoot' as const,
    // Shifted in -2
    d: 'M 133 370 L 113 370 C 108 380, 106 390, 113 400 C 123 405, 148 405, 158 400 C 163 390, 143 380, 133 370 Z',
  },
];

// Elf Female Paths (Narrower than Human Female, Pointed Ears)
const ELF_FEMALE_PATHS = [
  {
    region: 'neck' as const,
    d: 'M90 55 Q 100 62, 110 55 L 110 75 Q 100 82, 90 75 Z',
  },
  {
    region: 'head' as const,
    // Pointed Ears
    d: 'M100 10 C 90 10, 80 20, 78 30 L 65 25 L 75 45 C 78 55, 85 65, 100 65 C 115 65, 122 55, 125 45 L 135 25 L 122 30 C 120 20, 110 10, 100 10 Z',
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
    d: 'M 48 185 C 40 185, 35 200, 37 215 C 39 225, 45 230, 53 230 C 61 230, 67 255, 69 245 C 71 230, 66 185, 58 185 Z',
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

export const ELF_MALE_DEF: BodyMapDefinition = {
  id: 'elf-male',
  viewBox: '0 0 200 420',
  paths: ELF_MALE_PATHS,
};

export const ELF_FEMALE_DEF: BodyMapDefinition = {
  id: 'elf-female',
  viewBox: '0 0 200 420',
  paths: ELF_FEMALE_PATHS,
};

export const ELF_NEUTRAL_DEF: BodyMapDefinition = {
  id: 'elf-neutral',
  viewBox: '0 0 200 420',
  paths: ELF_MALE_PATHS,
};
