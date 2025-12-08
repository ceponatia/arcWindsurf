/**
 * Appearance value pools for character generation.
 */

import type { WeightedValue } from '../../types.js';

// ============================================================================
// Height
// ============================================================================

export const HEIGHTS = ['petite', 'short', 'average', 'tall', 'very tall'] as const;

export const HEIGHTS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'petite', weight: 15 },
  { value: 'short', weight: 25 },
  { value: 'average', weight: 35 },
  { value: 'tall', weight: 20 },
  { value: 'very tall', weight: 5 },
];

export const HEIGHTS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'petite', weight: 5 },
  { value: 'short', weight: 15 },
  { value: 'average', weight: 35 },
  { value: 'tall', weight: 30 },
  { value: 'very tall', weight: 15 },
];

// ============================================================================
// Body Build
// ============================================================================

export const BUILDS = [
  'slender',
  'slim',
  'lean',
  'average',
  'toned',
  'athletic',
  'muscular',
  'curvy',
  'voluptuous',
  'stocky',
  'heavyset',
] as const;

export const BUILDS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'slender', weight: 15 },
  { value: 'slim', weight: 20 },
  { value: 'lean', weight: 10 },
  { value: 'average', weight: 20 },
  { value: 'toned', weight: 10 },
  { value: 'athletic', weight: 8 },
  { value: 'curvy', weight: 10 },
  { value: 'voluptuous', weight: 5 },
  { value: 'stocky', weight: 1 },
  { value: 'heavyset', weight: 1 },
];

export const BUILDS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'slender', weight: 10 },
  { value: 'slim', weight: 12 },
  { value: 'lean', weight: 15 },
  { value: 'average', weight: 20 },
  { value: 'toned', weight: 12 },
  { value: 'athletic', weight: 15 },
  { value: 'muscular', weight: 10 },
  { value: 'stocky', weight: 4 },
  { value: 'heavyset', weight: 2 },
];

// ============================================================================
// Skin Tone
// ============================================================================

export const SKIN_TONES = [
  'porcelain',
  'ivory',
  'fair',
  'light',
  'medium',
  'olive',
  'tan',
  'caramel',
  'brown',
  'dark brown',
  'ebony',
] as const;

export const SKIN_TONES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'porcelain', weight: 5 },
  { value: 'ivory', weight: 8 },
  { value: 'fair', weight: 12 },
  { value: 'light', weight: 15 },
  { value: 'medium', weight: 18 },
  { value: 'olive', weight: 12 },
  { value: 'tan', weight: 10 },
  { value: 'caramel', weight: 8 },
  { value: 'brown', weight: 6 },
  { value: 'dark brown', weight: 4 },
  { value: 'ebony', weight: 2 },
];

// ============================================================================
// Hair
// ============================================================================

export const HAIR_COLORS = [
  'black',
  'dark brown',
  'brown',
  'chestnut',
  'auburn',
  'red',
  'ginger',
  'strawberry blonde',
  'golden blonde',
  'blonde',
  'platinum blonde',
  'silver',
  'white',
  'gray',
] as const;

export const HAIR_COLORS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'black', weight: 20 },
  { value: 'dark brown', weight: 18 },
  { value: 'brown', weight: 18 },
  { value: 'chestnut', weight: 8 },
  { value: 'auburn', weight: 6 },
  { value: 'red', weight: 4 },
  { value: 'ginger', weight: 3 },
  { value: 'strawberry blonde', weight: 3 },
  { value: 'golden blonde', weight: 6 },
  { value: 'blonde', weight: 8 },
  { value: 'platinum blonde', weight: 3 },
  { value: 'silver', weight: 1 },
  { value: 'white', weight: 1 },
  { value: 'gray', weight: 1 },
];

export const HAIR_STYLES = [
  'straight',
  'wavy',
  'curly',
  'coily',
  'layered',
  'feathered',
  'textured',
  'sleek',
  'tousled',
  'messy',
  'voluminous',
] as const;

export const HAIR_STYLES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'straight', weight: 25 },
  { value: 'wavy', weight: 25 },
  { value: 'curly', weight: 15 },
  { value: 'coily', weight: 5 },
  { value: 'layered', weight: 8 },
  { value: 'feathered', weight: 3 },
  { value: 'textured', weight: 5 },
  { value: 'sleek', weight: 4 },
  { value: 'tousled', weight: 5 },
  { value: 'messy', weight: 3 },
  { value: 'voluminous', weight: 2 },
];

export const HAIR_LENGTHS = [
  'pixie',
  'cropped',
  'short',
  'chin-length',
  'shoulder-length',
  'medium',
  'long',
  'very long',
  'waist-length',
] as const;

export const HAIR_LENGTHS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'pixie', weight: 5 },
  { value: 'cropped', weight: 5 },
  { value: 'short', weight: 10 },
  { value: 'chin-length', weight: 10 },
  { value: 'shoulder-length', weight: 20 },
  { value: 'medium', weight: 20 },
  { value: 'long', weight: 20 },
  { value: 'very long', weight: 7 },
  { value: 'waist-length', weight: 3 },
];

export const HAIR_LENGTHS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'cropped', weight: 25 },
  { value: 'short', weight: 40 },
  { value: 'chin-length', weight: 15 },
  { value: 'shoulder-length', weight: 10 },
  { value: 'medium', weight: 5 },
  { value: 'long', weight: 4 },
  { value: 'very long', weight: 1 },
];

// ============================================================================
// Eyes
// ============================================================================

export const EYE_COLORS = [
  'dark brown',
  'brown',
  'amber',
  'hazel',
  'green',
  'gray',
  'blue-gray',
  'blue',
  'light blue',
  'violet',
] as const;

export const EYE_COLORS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'dark brown', weight: 25 },
  { value: 'brown', weight: 25 },
  { value: 'amber', weight: 5 },
  { value: 'hazel', weight: 12 },
  { value: 'green', weight: 8 },
  { value: 'gray', weight: 5 },
  { value: 'blue-gray', weight: 5 },
  { value: 'blue', weight: 10 },
  { value: 'light blue', weight: 4 },
  { value: 'violet', weight: 1 },
];

export const EYE_SHAPES = [
  'almond',
  'round',
  'hooded',
  'monolid',
  'upturned',
  'downturned',
  'wide-set',
  'close-set',
  'deep-set',
  'prominent',
] as const;

export const EYE_SHAPES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'almond', weight: 30 },
  { value: 'round', weight: 20 },
  { value: 'hooded', weight: 15 },
  { value: 'monolid', weight: 10 },
  { value: 'upturned', weight: 8 },
  { value: 'downturned', weight: 5 },
  { value: 'wide-set', weight: 4 },
  { value: 'close-set', weight: 3 },
  { value: 'deep-set', weight: 3 },
  { value: 'prominent', weight: 2 },
];

// ============================================================================
// Face
// ============================================================================

export const FACE_SHAPES = [
  'oval',
  'round',
  'square',
  'heart',
  'oblong',
  'diamond',
  'rectangular',
  'triangular',
] as const;

export const FACE_SHAPES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'oval', weight: 25 },
  { value: 'round', weight: 20 },
  { value: 'square', weight: 15 },
  { value: 'heart', weight: 15 },
  { value: 'oblong', weight: 8 },
  { value: 'diamond', weight: 8 },
  { value: 'rectangular', weight: 5 },
  { value: 'triangular', weight: 4 },
];

export const FACE_FEATURES = [
  'high cheekbones',
  'prominent cheekbones',
  'soft cheekbones',
  'strong jawline',
  'delicate jawline',
  'rounded chin',
  'pointed chin',
  'cleft chin',
  'dimples',
  'freckles',
  'beauty mark',
  'full lips',
  'thin lips',
  "cupid's bow lips",
  'button nose',
  'straight nose',
  'aquiline nose',
  'upturned nose',
  'arched eyebrows',
  'straight eyebrows',
  'thick eyebrows',
  'thin eyebrows',
  'long eyelashes',
  'thick eyelashes',
] as const;

// ============================================================================
// Body Parts
// ============================================================================

export const ARM_BUILDS = ['slender', 'toned', 'average', 'muscular', 'soft'] as const;

export const LEG_BUILDS = ['slender', 'toned', 'average', 'muscular', 'shapely', 'long'] as const;

export const FOOT_SIZES = ['petite', 'small', 'average', 'large'] as const;

export const FOOT_SIZES_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'petite', weight: 20 },
  { value: 'small', weight: 35 },
  { value: 'average', weight: 35 },
  { value: 'large', weight: 10 },
];

export const FOOT_SIZES_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'petite', weight: 5 },
  { value: 'small', weight: 15 },
  { value: 'average', weight: 45 },
  { value: 'large', weight: 35 },
];

// ============================================================================
// Female-Specific
// ============================================================================

export const BREAST_SIZES = [
  'small',
  'petite',
  'modest',
  'average',
  'full',
  'ample',
  'large',
  'generous',
] as const;

export const BREAST_SIZES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'small', weight: 10 },
  { value: 'petite', weight: 12 },
  { value: 'modest', weight: 15 },
  { value: 'average', weight: 25 },
  { value: 'full', weight: 18 },
  { value: 'ample', weight: 10 },
  { value: 'large', weight: 7 },
  { value: 'generous', weight: 3 },
];

export const BREAST_SHAPES = [
  'rounded',
  'teardrop',
  'perky',
  'natural',
  'athletic',
  'full',
] as const;

export const HIP_WIDTHS = ['narrow', 'slim', 'average', 'curvy', 'wide', 'shapely'] as const;

export const HIP_WIDTHS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'narrow', weight: 10 },
  { value: 'slim', weight: 15 },
  { value: 'average', weight: 30 },
  { value: 'curvy', weight: 25 },
  { value: 'wide', weight: 10 },
  { value: 'shapely', weight: 10 },
];

export const BUTTOCK_SIZES = [
  'small',
  'petite',
  'average',
  'round',
  'full',
  'pert',
  'shapely',
] as const;

export const BUTTOCK_SHAPES = [
  'round',
  'heart-shaped',
  'square',
  'athletic',
  'perky',
  'flat',
] as const;

// ============================================================================
// Male-Specific
// ============================================================================

export const CHEST_BUILDS_MALE = [
  'slim',
  'lean',
  'average',
  'toned',
  'athletic',
  'muscular',
  'broad',
] as const;

export const CHEST_BUILDS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'slim', weight: 10 },
  { value: 'lean', weight: 15 },
  { value: 'average', weight: 25 },
  { value: 'toned', weight: 20 },
  { value: 'athletic', weight: 15 },
  { value: 'muscular', weight: 10 },
  { value: 'broad', weight: 5 },
];

export const SHOULDER_WIDTHS = ['narrow', 'average', 'broad', 'wide', 'athletic'] as const;

export const SHOULDER_WIDTHS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'narrow', weight: 10 },
  { value: 'average', weight: 30 },
  { value: 'broad', weight: 30 },
  { value: 'wide', weight: 15 },
  { value: 'athletic', weight: 15 },
];

export const SHOULDER_WIDTHS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'narrow', weight: 25 },
  { value: 'average', weight: 40 },
  { value: 'broad', weight: 20 },
  { value: 'athletic', weight: 10 },
  { value: 'wide', weight: 5 },
];

// ============================================================================
// Waist & Hips
// ============================================================================

export const WAIST_WIDTHS = ['narrow', 'slim', 'average', 'wide', 'thick'] as const;

export const WAIST_WIDTHS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'narrow', weight: 20 },
  { value: 'slim', weight: 30 },
  { value: 'average', weight: 30 },
  { value: 'wide', weight: 15 },
  { value: 'thick', weight: 5 },
];

export const WAIST_WIDTHS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'narrow', weight: 10 },
  { value: 'slim', weight: 20 },
  { value: 'average', weight: 40 },
  { value: 'wide', weight: 20 },
  { value: 'thick', weight: 10 },
];

// ============================================================================
// Thighs & Calves
// ============================================================================

export const THIGH_BUILDS = [
  'slender',
  'toned',
  'average',
  'thick',
  'muscular',
  'shapely',
] as const;

export const THIGH_BUILDS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'slender', weight: 15 },
  { value: 'toned', weight: 20 },
  { value: 'average', weight: 25 },
  { value: 'thick', weight: 15 },
  { value: 'shapely', weight: 20 },
  { value: 'muscular', weight: 5 },
];

export const THIGH_BUILDS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'slender', weight: 10 },
  { value: 'toned', weight: 25 },
  { value: 'average', weight: 30 },
  { value: 'thick', weight: 15 },
  { value: 'muscular', weight: 20 },
];

export const CALF_BUILDS = ['slender', 'toned', 'average', 'muscular', 'defined'] as const;

// ============================================================================
// Neck
// ============================================================================

export const NECK_LENGTHS = ['short', 'average', 'long', 'slender'] as const;

export const NECK_DESCRIPTIONS = [
  'slender',
  'graceful',
  'muscular',
  'average',
  'long and elegant',
  'strong',
] as const;

// ============================================================================
// Abdomen
// ============================================================================

export const ABDOMEN_BUILDS = ['flat', 'toned', 'soft', 'average', 'defined', 'muscular'] as const;

export const ABDOMEN_BUILDS_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'flat', weight: 20 },
  { value: 'toned', weight: 25 },
  { value: 'soft', weight: 20 },
  { value: 'average', weight: 25 },
  { value: 'defined', weight: 8 },
  { value: 'muscular', weight: 2 },
];

export const ABDOMEN_BUILDS_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'flat', weight: 15 },
  { value: 'toned', weight: 20 },
  { value: 'soft', weight: 15 },
  { value: 'average', weight: 25 },
  { value: 'defined', weight: 15 },
  { value: 'muscular', weight: 10 },
];

// ============================================================================
// Grooming (for various regions)
// ============================================================================

export const GROOMING_STYLES = [
  'clean-shaven',
  'shaved',
  'waxed',
  'trimmed',
  'natural',
  'neatly groomed',
] as const;

export const GROOMING_STYLES_FEMALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'shaved', weight: 30 },
  { value: 'waxed', weight: 25 },
  { value: 'trimmed', weight: 20 },
  { value: 'neatly groomed', weight: 15 },
  { value: 'natural', weight: 10 },
];

export const GROOMING_STYLES_MALE_WEIGHTED: WeightedValue<string>[] = [
  { value: 'trimmed', weight: 35 },
  { value: 'natural', weight: 25 },
  { value: 'neatly groomed', weight: 20 },
  { value: 'shaved', weight: 15 },
  { value: 'clean-shaven', weight: 5 },
];
