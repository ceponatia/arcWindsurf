/**
 * Personality value pools for character generation.
 */

import type { WeightedValue } from '../../types.js';

// ============================================================================
// Simple Trait Keywords
// ============================================================================

/**
 * Positive personality traits.
 */
export const POSITIVE_TRAITS = [
  'kind',
  'compassionate',
  'empathetic',
  'generous',
  'loyal',
  'honest',
  'reliable',
  'patient',
  'forgiving',
  'humble',
  'confident',
  'optimistic',
  'cheerful',
  'friendly',
  'warm',
  'caring',
  'supportive',
  'encouraging',
  'creative',
  'imaginative',
  'curious',
  'intelligent',
  'witty',
  'articulate',
  'thoughtful',
  'perceptive',
  'intuitive',
  'adaptable',
  'resilient',
  'determined',
  'ambitious',
  'driven',
  'passionate',
  'energetic',
  'enthusiastic',
  'playful',
  'adventurous',
  'bold',
  'courageous',
  'independent',
] as const;

/**
 * Neutral/complex personality traits.
 */
export const NEUTRAL_TRAITS = [
  'reserved',
  'quiet',
  'introspective',
  'private',
  'serious',
  'analytical',
  'logical',
  'practical',
  'pragmatic',
  'cautious',
  'careful',
  'methodical',
  'organized',
  'perfectionist',
  'competitive',
  'ambitious',
  'assertive',
  'direct',
  'blunt',
  'skeptical',
  'questioning',
  'independent',
  'self-reliant',
  'stubborn',
  'persistent',
  'intense',
  'passionate',
  'emotional',
  'sensitive',
  'idealistic',
] as const;

/**
 * Traits that add complexity/flaws (not purely negative).
 */
export const COMPLEX_TRAITS = [
  'anxious',
  'nervous',
  'shy',
  'insecure',
  'self-conscious',
  'guarded',
  'distant',
  'aloof',
  'sarcastic',
  'cynical',
  'jaded',
  'moody',
  'temperamental',
  'impulsive',
  'reckless',
  'restless',
  'impatient',
  'demanding',
  'critical',
  'judgmental',
  'possessive',
  'jealous',
  'secretive',
  'manipulative',
  'controlling',
  'prideful',
  'vain',
  'selfish',
  'lazy',
  'indecisive',
] as const;

/**
 * All traits combined.
 */
export const ALL_TRAITS = [...POSITIVE_TRAITS, ...NEUTRAL_TRAITS, ...COMPLEX_TRAITS] as const;

// ============================================================================
// Values
// ============================================================================

/**
 * Core values weighted by commonality.
 */
export const VALUES_WEIGHTED: WeightedValue<string>[] = [
  // Most common
  { value: 'loyalty', weight: 15 },
  { value: 'honesty', weight: 15 },
  { value: 'freedom', weight: 12 },
  { value: 'independence', weight: 12 },
  { value: 'creativity', weight: 10 },
  { value: 'success', weight: 10 },
  { value: 'stability', weight: 10 },
  { value: 'enjoyment', weight: 8 },
  { value: 'helpfulness', weight: 8 },
  // Less common
  { value: 'ambition', weight: 6 },
  { value: 'curiosity', weight: 6 },
  { value: 'wisdom', weight: 5 },
  { value: 'justice', weight: 5 },
  { value: 'challenge', weight: 4 },
  { value: 'novelty', weight: 4 },
  { value: 'excitement', weight: 4 },
  // Rare
  { value: 'authority', weight: 2 },
  { value: 'dominance', weight: 2 },
  { value: 'prestige', weight: 3 },
  { value: 'devotion', weight: 3 },
];

// ============================================================================
// Fears
// ============================================================================

/**
 * Fear categories with weights.
 */
export const FEAR_CATEGORIES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'rejection', weight: 20 },
  { value: 'failure', weight: 20 },
  { value: 'abandonment', weight: 15 },
  { value: 'loss', weight: 12 },
  { value: 'exposure', weight: 10 },
  { value: 'intimacy', weight: 8 },
  { value: 'helplessness', weight: 6 },
  { value: 'change', weight: 5 },
  { value: 'unknown', weight: 3 },
  { value: 'death', weight: 1 },
];

/**
 * Specific fear descriptions by category.
 */
export const FEAR_DESCRIPTIONS: Record<string, readonly string[]> = {
  rejection: [
    'being rejected by those they care about',
    'not being accepted by their peers',
    'being seen as unworthy of love',
    'being excluded from social groups',
    'their true self being rejected',
  ],
  failure: [
    'failing to meet expectations',
    'disappointing people who believe in them',
    'not achieving their goals',
    'being seen as incompetent',
    'making irreversible mistakes',
  ],
  abandonment: [
    'being left alone',
    'people they love leaving them',
    'being forgotten',
    'losing everyone they care about',
    'being discarded when no longer useful',
  ],
  loss: [
    'losing their loved ones',
    'losing their sense of self',
    'losing their independence',
    'losing their memories',
    'losing what makes them special',
  ],
  exposure: [
    'their secrets being revealed',
    'being seen as a fraud',
    'their vulnerabilities being exploited',
    'their past catching up with them',
    'being truly known and found wanting',
  ],
  intimacy: [
    'letting someone get too close',
    'being vulnerable with another person',
    'emotional dependency',
    'losing themselves in a relationship',
    'being hurt by someone they trust',
  ],
  helplessness: [
    'being powerless to help those they love',
    'losing control of their life',
    'being at the mercy of others',
    'having no options or choices',
    'being trapped with no way out',
  ],
  change: [
    'things changing too quickly',
    'the unknown future',
    'losing the stability they have built',
    'having to start over',
    'becoming someone they do not recognize',
  ],
  unknown: [
    'what lies in the darkness',
    'things they cannot understand',
    'forces beyond their comprehension',
    'the uncertainty of existence',
    'what happens after death',
  ],
  death: [
    'dying before accomplishing their goals',
    'a painful death',
    'dying alone',
    'the finality of death',
    'leaving loved ones behind',
  ],
};

/**
 * Common fear triggers.
 */
export const FEAR_TRIGGERS = [
  'silence after expressing feelings',
  'being ignored',
  "seeing disappointment in others' eyes",
  'comparing themselves to others',
  'receiving criticism',
  'public speaking',
  'confrontation',
  'being alone for too long',
  'crowded spaces',
  'feeling out of control',
  'unexpected changes',
  'people asking too many questions',
  'feeling trapped',
  'tight deadlines',
  'making decisions that affect others',
] as const;

// ============================================================================
// Coping Mechanisms
// ============================================================================

export const COPING_MECHANISMS_WEIGHTED: WeightedValue<string>[] = [
  { value: 'avoidance', weight: 30 },
  { value: 'humor', weight: 25 },
  { value: 'denial', weight: 15 },
  { value: 'confrontation', weight: 15 },
  { value: 'aggression', weight: 15 },
];

// ============================================================================
// Attachment Styles
// ============================================================================

export const ATTACHMENT_STYLES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'secure', weight: 40 },
  { value: 'anxious-preoccupied', weight: 25 },
  { value: 'dismissive-avoidant', weight: 20 },
  { value: 'fearful-avoidant', weight: 15 },
];

// ============================================================================
// Emotions
// ============================================================================

export const MOOD_BASELINES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'trust', weight: 25 },
  { value: 'anticipation', weight: 20 },
  { value: 'joy', weight: 20 },
  { value: 'sadness', weight: 10 },
  { value: 'fear', weight: 8 },
  { value: 'anger', weight: 7 },
  { value: 'surprise', weight: 5 },
  { value: 'disgust', weight: 5 },
];

export const CURRENT_EMOTIONS = [
  'joy',
  'trust',
  'anticipation',
  'surprise',
  'sadness',
  'fear',
  'anger',
  'disgust',
] as const;

export const EMOTION_INTENSITIES = ['mild', 'moderate', 'strong', 'intense'] as const;

export const EMOTION_INTENSITIES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'mild', weight: 40 },
  { value: 'moderate', weight: 35 },
  { value: 'strong', weight: 20 },
  { value: 'intense', weight: 5 },
];

// ============================================================================
// Stress & Soothing
// ============================================================================

export const STRESS_RESPONSES_WEIGHTED: WeightedValue<string>[] = [
  { value: 'freeze', weight: 30 },
  { value: 'flight', weight: 30 },
  { value: 'fawn', weight: 25 },
  { value: 'fight', weight: 15 },
];

export const SOOTHING_ACTIVITIES = [
  'listening to music',
  'taking a long walk',
  'reading a book',
  'taking a hot bath',
  'exercising',
  'cooking or baking',
  'talking to a friend',
  'being in nature',
  'meditation or deep breathing',
  'watching comfort shows',
  'cuddling with a pet',
  'journaling',
  'creating art',
  'playing video games',
  'organizing their space',
  'drinking tea or coffee',
  'gardening',
  'shopping',
  'sleeping',
  'comfort eating',
] as const;

export const STRESS_INDICATORS = [
  'becomes unusually quiet',
  'talks faster than normal',
  'fidgets with hands or objects',
  'avoids eye contact',
  'laughs nervously',
  'becomes snappy or irritable',
  'withdraws from social interaction',
  'overthinks every decision',
  'difficulty sleeping',
  'loses appetite',
  'becomes overly focused on work',
  'starts cleaning obsessively',
  'bites nails or lips',
  'paces around',
  'becomes forgetful',
] as const;
