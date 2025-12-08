/**
 * Modern Woman theme - generates contemporary female characters.
 * Biased toward common modern woman archetypes and characteristics.
 */

import type { CharacterTheme } from '../types.js';
import {
  FEMALE_FIRST_NAMES,
  LAST_NAMES,
  HEIGHTS_FEMALE_WEIGHTED,
  BUILDS_FEMALE_WEIGHTED,
  SKIN_TONES_WEIGHTED,
  HAIR_COLORS_WEIGHTED,
  HAIR_STYLES_WEIGHTED,
  HAIR_LENGTHS_FEMALE_WEIGHTED,
  EYE_COLORS_WEIGHTED,
  EYE_SHAPES_WEIGHTED,
  FACE_SHAPES_WEIGHTED,
  FACE_FEATURES,
  ARM_BUILDS,
  LEG_BUILDS,
  FOOT_SIZES_FEMALE_WEIGHTED,
  VALUES_WEIGHTED,
  FEAR_CATEGORIES_WEIGHTED,
  FEAR_DESCRIPTIONS,
  FEAR_TRIGGERS,
  COPING_MECHANISMS_WEIGHTED,
  ATTACHMENT_STYLES_WEIGHTED,
  MOOD_BASELINES_WEIGHTED,
  CURRENT_EMOTIONS,
  EMOTION_INTENSITIES_WEIGHTED,
  SOOTHING_ACTIVITIES,
  STRESS_INDICATORS,
  BODY_SCENTS,
  HAIR_SCENTS,
  SKIN_SCENTS,
  PERFUME_NOTES,
  SKIN_TEXTURES,
  HAIR_TEXTURES,
  HAND_TEXTURES,
  FOOT_TEXTURES,
  SUMMARY_TEMPLATES_FEMALE,
  BACKSTORY_TEMPLATES,
} from '../pools/index.js';

/**
 * Curated traits more common in modern woman characterizations.
 */
const MODERN_WOMAN_TRAITS = [
  // Positive traits emphasized
  'confident',
  'independent',
  'ambitious',
  'caring',
  'intelligent',
  'creative',
  'witty',
  'warm',
  'resilient',
  'passionate',
  'driven',
  'empathetic',
  'supportive',
  'adventurous',
  'curious',
  // Some complexity
  'perfectionist',
  'anxious',
  'guarded',
  'sensitive',
  'intense',
  'self-conscious',
] as const;

/**
 * Modern Woman theme.
 * Generates contemporary female characters with realistic, relatable traits.
 */
export const MODERN_WOMAN_THEME: CharacterTheme = {
  id: 'modern-woman',
  name: 'Modern Woman',
  description:
    'Contemporary female characters with realistic personalities, modern sensibilities, and relatable traits.',

  defaultGender: 'female',

  basics: {
    firstNames: FEMALE_FIRST_NAMES,
    lastNames: LAST_NAMES,
    ageRange: [21, 45],
    summaryTemplates: SUMMARY_TEMPLATES_FEMALE,
    backstoryTemplates: BACKSTORY_TEMPLATES,
    personalityTraits: MODERN_WOMAN_TRAITS,
  },

  appearance: {
    heights: HEIGHTS_FEMALE_WEIGHTED,
    builds: BUILDS_FEMALE_WEIGHTED,
    skinTones: SKIN_TONES_WEIGHTED,
    hairColors: HAIR_COLORS_WEIGHTED,
    hairStyles: HAIR_STYLES_WEIGHTED,
    hairLengths: HAIR_LENGTHS_FEMALE_WEIGHTED,
    eyeColors: EYE_COLORS_WEIGHTED,
    eyeShapes: EYE_SHAPES_WEIGHTED,
    faceShapes: FACE_SHAPES_WEIGHTED,
    faceFeatures: FACE_FEATURES,
    armBuilds: ARM_BUILDS,
    legBuilds: LEG_BUILDS,
    footSizes: FOOT_SIZES_FEMALE_WEIGHTED,
  },

  personality: {
    traits: MODERN_WOMAN_TRAITS,
    dimensionBiases: {
      // Modern women tend to score higher on openness and conscientiousness
      openness: [0.5, 0.8],
      conscientiousness: [0.5, 0.8],
      extraversion: [0.3, 0.7],
      agreeableness: [0.4, 0.8],
      neuroticism: [0.3, 0.6],
    },
    values: VALUES_WEIGHTED as CharacterTheme['personality']['values'],
    fearCategories: FEAR_CATEGORIES_WEIGHTED as CharacterTheme['personality']['fearCategories'],
    fearDescriptions: Object.values(FEAR_DESCRIPTIONS).flat(),
    fearTriggers: FEAR_TRIGGERS,
    copingMechanisms:
      COPING_MECHANISMS_WEIGHTED as CharacterTheme['personality']['copingMechanisms'],
    attachmentStyles:
      ATTACHMENT_STYLES_WEIGHTED as CharacterTheme['personality']['attachmentStyles'],
    moodBaselines: MOOD_BASELINES_WEIGHTED as CharacterTheme['personality']['moodBaselines'],
    currentEmotions: CURRENT_EMOTIONS,
    emotionIntensities:
      EMOTION_INTENSITIES_WEIGHTED as CharacterTheme['personality']['emotionIntensities'],
    soothingActivities: SOOTHING_ACTIVITIES,
    stressIndicators: STRESS_INDICATORS,
  },

  body: {
    general: {
      scentPrimaries: [...BODY_SCENTS, ...SKIN_SCENTS],
      scentNotes: [...HAIR_SCENTS, ...PERFUME_NOTES],
      texturePrimaries: SKIN_TEXTURES,
    },
    regions: {
      hair: {
        scentPrimaries: HAIR_SCENTS,
        texturePrimaries: HAIR_TEXTURES,
      },
      neck: {
        scentPrimaries: PERFUME_NOTES,
      },
      hands: {
        texturePrimaries: HAND_TEXTURES,
      },
      feet: {
        texturePrimaries: FOOT_TEXTURES,
      },
    },
    // Higher population rate for more detailed characters
    regionPopulationRate: 0.4,
  },

  details: {
    labels: {
      preference: [
        'favorite color',
        'favorite food',
        'favorite music genre',
        'favorite season',
        'preferred drink',
        'comfort movie',
      ],
      ability: ['skilled at', 'talented in', 'natural ability with', 'trained in', 'self-taught'],
      history: [
        'significant memory',
        'childhood dream',
        'turning point',
        'proudest moment',
        'lesson learned from',
      ],
      personality: [
        'pet peeve',
        'guilty pleasure',
        'secret talent',
        'quirk',
        'morning routine includes',
      ],
    },
    values: {
      preference: [
        'sage green',
        'dusty rose',
        'navy blue',
        'burgundy',
        'cream',
        'lavender',
        'Italian cuisine',
        'sushi',
        'brunch foods',
        'Thai food',
        'comfort food',
        'indie/alternative',
        'pop',
        'R&B',
        'lo-fi',
        'autumn',
        'spring',
        'coffee',
        'wine',
        'matcha',
        'tea',
      ],
      ability: [
        'cooking elaborate meals',
        'interior decorating',
        'photography',
        'playing an instrument',
        'creative writing',
        'public speaking',
        'languages',
        'organizing events',
        'reading people',
        'problem-solving under pressure',
      ],
      history: [
        'a solo trip that changed everything',
        'meeting their best friend',
        'a career breakthrough',
        'overcoming a fear',
        'leaving a toxic situation',
        'starting over somewhere new',
        'a relationship that taught them boundaries',
      ],
      personality: [
        'people who chew loudly',
        'being late',
        'true crime podcasts',
        'reality TV',
        'online shopping at 2am',
        'singing in the car',
        'remembering random facts',
        'always arriving 10 minutes early',
        'checking the horoscope',
        'making lists for everything',
      ],
    },
    countRange: [3, 6],
    focusAreas: ['preference', 'ability', 'personality'],
  },

  defaultTags: ['generated', 'modern', 'female'],
};
