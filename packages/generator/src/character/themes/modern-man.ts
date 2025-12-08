/**
 * Modern Man theme - generates contemporary male characters.
 * Biased toward common modern man archetypes and characteristics.
 */

import type { CharacterTheme } from '../types.js';
import {
  MALE_FIRST_NAMES,
  LAST_NAMES,
  HEIGHTS_MALE_WEIGHTED,
  BUILDS_MALE_WEIGHTED,
  SKIN_TONES_WEIGHTED,
  HAIR_COLORS_WEIGHTED,
  HAIR_STYLES_WEIGHTED,
  HAIR_LENGTHS_MALE_WEIGHTED,
  EYE_COLORS_WEIGHTED,
  EYE_SHAPES_WEIGHTED,
  FACE_SHAPES_WEIGHTED,
  FACE_FEATURES,
  ARM_BUILDS,
  LEG_BUILDS,
  FOOT_SIZES_MALE_WEIGHTED,
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
  SKIN_SCENTS,
  SKIN_TEXTURES,
  HAND_TEXTURES,
  SUMMARY_TEMPLATES_MALE,
  BACKSTORY_TEMPLATES,
} from '../pools/index.js';

/**
 * Curated traits more common in modern man characterizations.
 */
const MODERN_MAN_TRAITS = [
  // Positive traits emphasized
  'confident',
  'reliable',
  'ambitious',
  'intelligent',
  'witty',
  'protective',
  'determined',
  'adventurous',
  'loyal',
  'practical',
  'driven',
  'charismatic',
  'calm',
  'focused',
  'independent',
  // Some complexity
  'stubborn',
  'competitive',
  'guarded',
  'reserved',
  'intense',
  'perfectionist',
] as const;

/**
 * Modern Man theme.
 * Generates contemporary male characters with realistic personalities
 * and relatable traits.
 */
export const MODERN_MAN_THEME: CharacterTheme = {
  id: 'modern-man',
  name: 'Modern Man',
  description:
    'Contemporary male characters with realistic personalities, modern sensibilities, and relatable traits.',

  defaultGender: 'male',

  basics: {
    firstNames: MALE_FIRST_NAMES,
    lastNames: LAST_NAMES,
    ageRange: [21, 50],
    summaryTemplates: SUMMARY_TEMPLATES_MALE,
    backstoryTemplates: BACKSTORY_TEMPLATES,
    personalityTraits: MODERN_MAN_TRAITS,
  },

  appearance: {
    heights: HEIGHTS_MALE_WEIGHTED,
    builds: BUILDS_MALE_WEIGHTED,
    skinTones: SKIN_TONES_WEIGHTED,
    hairColors: HAIR_COLORS_WEIGHTED,
    hairStyles: HAIR_STYLES_WEIGHTED,
    hairLengths: HAIR_LENGTHS_MALE_WEIGHTED,
    eyeColors: EYE_COLORS_WEIGHTED,
    eyeShapes: EYE_SHAPES_WEIGHTED,
    faceShapes: FACE_SHAPES_WEIGHTED,
    faceFeatures: FACE_FEATURES,
    armBuilds: ARM_BUILDS,
    legBuilds: LEG_BUILDS,
    footSizes: FOOT_SIZES_MALE_WEIGHTED,
  },

  personality: {
    traits: MODERN_MAN_TRAITS,
    dimensionBiases: {
      // Modern men tend to vary more on openness
      openness: [0.3, 0.7],
      conscientiousness: [0.4, 0.8],
      extraversion: [0.3, 0.7],
      agreeableness: [0.3, 0.7],
      // Generally lower neuroticism
      neuroticism: [0.2, 0.5],
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
      texturePrimaries: SKIN_TEXTURES,
    },
    regions: {
      hands: {
        texturePrimaries: HAND_TEXTURES,
      },
    },
    // Moderate population rate
    regionPopulationRate: 0.35,
  },

  details: {
    labels: {
      preference: [
        'favorite sport',
        'favorite food',
        'favorite music genre',
        'preferred drink',
        'go-to relaxation',
        'favorite movie genre',
      ],
      ability: [
        'skilled at',
        'talented in',
        'trained in',
        'natural ability with',
        'experienced in',
      ],
      history: [
        'formative experience',
        'turning point',
        'proudest achievement',
        'lesson learned',
        'challenge overcome',
      ],
      personality: [
        'pet peeve',
        'guilty pleasure',
        'competitive about',
        'relaxes by',
        'morning routine',
      ],
    },
    values: {
      preference: [
        'basketball',
        'football',
        'running',
        'weightlifting',
        'golf',
        'steak',
        'burgers',
        'sushi',
        'Italian food',
        'Mexican food',
        'rock',
        'hip-hop',
        'jazz',
        'electronic',
        'country',
        'whiskey',
        'beer',
        'coffee',
        'action movies',
        'thrillers',
        'sci-fi',
        'comedy',
      ],
      ability: [
        'fixing things around the house',
        'cooking on the grill',
        'negotiation',
        'strategic thinking',
        'building things',
        'public speaking',
        'staying calm under pressure',
        'physical fitness',
        'leading teams',
        'solving problems',
      ],
      history: [
        'a defining competition or challenge',
        'moving away from home',
        'a career milestone',
        'learning from failure',
        'a mentorship that shaped them',
        'overcoming adversity',
        'finding their passion',
      ],
      personality: [
        'people who are late',
        'inefficiency',
        'dishonesty',
        'video games',
        'watching sports',
        'working out',
        'board games',
        'always being early',
        'checking the news first thing',
        'coffee before anything else',
      ],
    },
    countRange: [3, 6],
    focusAreas: ['preference', 'ability', 'personality'],
  },

  defaultTags: ['generated', 'modern', 'male'],
};
