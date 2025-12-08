/**
 * Sensory value pools for body region descriptions.
 */

import type { WeightedValue } from '../../types.js';

// ============================================================================
// Scent
// ============================================================================

/**
 * General body scents (natural).
 */
export const BODY_SCENTS = [
  'clean',
  'fresh',
  'warm',
  'natural',
  'faint musk',
  'light musk',
  'subtle sweetness',
  'earthy',
  'slightly floral',
] as const;

/**
 * Hair scents (shampoo/products).
 */
export const HAIR_SCENTS = [
  'lavender shampoo',
  'coconut',
  'vanilla',
  'citrus',
  'floral',
  'fruity',
  'fresh and clean',
  'herbal',
  'rose',
  'jasmine',
  'mint',
  'argan oil',
] as const;

/**
 * Skin scents (lotion/perfume notes).
 */
export const SKIN_SCENTS = [
  'subtle perfume',
  'light vanilla',
  'cocoa butter',
  'almond',
  'honey',
  'rose',
  'jasmine',
  'sandalwood',
  'fresh linen',
  'natural skin',
] as const;

/**
 * Perfume/cologne notes for neck/chest.
 */
export const PERFUME_NOTES = [
  'floral with a hint of musk',
  'light citrus and bergamot',
  'warm vanilla and amber',
  'fresh and aquatic',
  'rose and oud',
  'jasmine and sandalwood',
  'sweet and fruity',
  'clean and powdery',
  'spicy with warm undertones',
  'green and herbal',
] as const;

export const SCENT_INTENSITIES: WeightedValue<number>[] = [
  { value: 0.2, weight: 10 },
  { value: 0.3, weight: 20 },
  { value: 0.4, weight: 25 },
  { value: 0.5, weight: 25 },
  { value: 0.6, weight: 15 },
  { value: 0.7, weight: 5 },
];

// ============================================================================
// Texture
// ============================================================================

/**
 * Skin textures.
 */
export const SKIN_TEXTURES = [
  'soft',
  'smooth',
  'silky',
  'supple',
  'velvety',
  'delicate',
  'warm',
  'cool',
] as const;

/**
 * Hair textures.
 */
export const HAIR_TEXTURES = [
  'silky',
  'soft',
  'thick',
  'fine',
  'fluffy',
  'sleek',
  'bouncy',
] as const;

/**
 * Hand textures.
 */
export const HAND_TEXTURES = [
  'soft',
  'smooth',
  'delicate',
  'warm',
  'gentle',
  'slightly calloused',
  'manicured',
] as const;

/**
 * Foot textures.
 */
export const FOOT_TEXTURES = [
  'soft',
  'smooth',
  'well-maintained',
  'delicate',
  'pampered',
  'slightly calloused heels',
] as const;

/**
 * Temperature descriptors.
 */
export const TEMPERATURES = ['cold', 'cool', 'neutral', 'warm', 'hot'] as const;

export const TEMPERATURES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'cold', weight: 5 },
  { value: 'cool', weight: 15 },
  { value: 'neutral', weight: 30 },
  { value: 'warm', weight: 40 },
  { value: 'hot', weight: 10 },
];

/**
 * Moisture levels.
 */
export const MOISTURE_LEVELS = ['dry', 'normal', 'damp', 'wet'] as const;

export const MOISTURE_LEVELS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'dry', weight: 15 },
  { value: 'normal', weight: 60 },
  { value: 'damp', weight: 20 },
  { value: 'wet', weight: 5 },
];

// ============================================================================
// Visual
// ============================================================================

/**
 * Skin conditions.
 */
export const SKIN_CONDITIONS = [
  'flawless',
  'normal',
  'clear',
  'smooth',
  'freckled',
  'light freckles',
  'beauty marks',
] as const;

export const SKIN_CONDITIONS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'flawless', weight: 15 },
  { value: 'normal', weight: 30 },
  { value: 'clear', weight: 25 },
  { value: 'smooth', weight: 15 },
  { value: 'freckled', weight: 5 },
  { value: 'light freckles', weight: 7 },
  { value: 'beauty marks', weight: 3 },
];

/**
 * Grooming states.
 */
export const GROOMING_STATES = [
  'clean-shaven',
  'shaved',
  'waxed',
  'trimmed',
  'natural',
  'neatly groomed',
] as const;

export const GROOMING_STATES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'clean-shaven', weight: 20 },
  { value: 'shaved', weight: 25 },
  { value: 'waxed', weight: 15 },
  { value: 'trimmed', weight: 20 },
  { value: 'natural', weight: 10 },
  { value: 'neatly groomed', weight: 10 },
];

// ============================================================================
// Flavor (for intimate contexts)
// ============================================================================

/**
 * General skin flavors.
 */
export const SKIN_FLAVORS = [
  'slightly salty',
  'clean',
  'neutral',
  'faintly sweet',
  'natural',
] as const;

export const SKIN_FLAVORS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'slightly salty', weight: 30 },
  { value: 'clean', weight: 25 },
  { value: 'neutral', weight: 20 },
  { value: 'faintly sweet', weight: 15 },
  { value: 'natural', weight: 10 },
];

// ============================================================================
// Visual Descriptions (for body regions)
// ============================================================================

/**
 * General visual descriptions for body regions.
 */
export const VISUAL_DESCRIPTIONS = [
  'smooth and unblemished',
  'naturally soft',
  'well-maintained',
  'healthy looking',
  'delicate',
  'refined',
  'graceful',
  'elegant',
] as const;

/**
 * Hair visual descriptions.
 */
export const HAIR_VISUALS = [
  'lustrous and healthy',
  'thick and full',
  'fine and silky',
  'natural shine',
  'well-maintained',
  'slightly tousled',
  'soft and flowing',
  'bouncy and voluminous',
] as const;

/**
 * Face visual descriptions.
 */
export const FACE_VISUALS = [
  'soft features',
  'defined cheekbones',
  'expressive eyes',
  'warm complexion',
  'angular jawline',
  'rounded features',
  'striking appearance',
  'natural beauty',
] as const;

/**
 * Hand visual descriptions.
 */
export const HAND_VISUALS = [
  'well-manicured',
  'slender fingers',
  'soft and delicate',
  'elegant hands',
  'strong hands',
  'long fingers',
  'graceful fingers',
  'neat nails',
] as const;

/**
 * Foot visual descriptions.
 */
export const FOOT_VISUALS = [
  'well-maintained',
  'delicate',
  'petite',
  'slender',
  'pampered',
  'natural arch',
  'dainty toes',
  'soft soles',
] as const;

/**
 * Torso visual descriptions.
 */
export const TORSO_VISUALS = [
  'smooth skin',
  'toned',
  'slender',
  'well-proportioned',
  'athletic',
  'soft curves',
  'defined muscles',
  'natural shape',
] as const;

/**
 * Intimate region visual descriptions (tasteful).
 */
export const INTIMATE_VISUALS = [
  'well-groomed',
  'natural',
  'neatly maintained',
  'clean',
  'smooth',
] as const;

// ============================================================================
// Skin Conditions (for visual data)
// ============================================================================

export const VISUAL_SKIN_CONDITIONS = [
  'flawless',
  'normal',
  'freckled',
  'light freckles',
  'beauty marks',
] as const;

export const VISUAL_SKIN_CONDITIONS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'flawless', weight: 20 },
  { value: 'normal', weight: 40 },
  { value: 'light freckles', weight: 20 },
  { value: 'freckled', weight: 10 },
  { value: 'beauty marks', weight: 10 },
];

// ============================================================================
// Visual Features (distinguishing marks)
// ============================================================================

export const VISUAL_FEATURES = [
  'beauty mark',
  'light freckles',
  'small mole',
  'dimple',
  'no distinguishing marks',
] as const;

export const VISUAL_FEATURES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'no distinguishing marks', weight: 50 },
  { value: 'beauty mark', weight: 15 },
  { value: 'light freckles', weight: 15 },
  { value: 'small mole', weight: 10 },
  { value: 'dimple', weight: 10 },
];

// ============================================================================
// Flavor (expanded for intimate contexts)
// ============================================================================

/**
 * Mouth/lips flavor.
 */
export const MOUTH_FLAVORS = [
  'fresh mint',
  'clean',
  'faintly sweet',
  'neutral',
  'hint of coffee',
  'natural',
] as const;

/**
 * Neck flavor.
 */
export const NECK_FLAVORS = [
  'clean skin',
  'faint perfume',
  'slightly salty',
  'natural',
  'fresh',
] as const;

/**
 * Intimate region flavors (tasteful).
 */
export const INTIMATE_FLAVORS = [
  'clean',
  'natural',
  'slightly musky',
  'faintly sweet',
  'fresh',
] as const;

export const INTIMATE_FLAVORS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'clean', weight: 30 },
  { value: 'natural', weight: 25 },
  { value: 'fresh', weight: 20 },
  { value: 'faintly sweet', weight: 15 },
  { value: 'slightly musky', weight: 10 },
];
