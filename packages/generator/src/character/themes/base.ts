/**
 * Base theme - provides default pools that other themes can override.
 * This theme generates completely random characters with no specific bias.
 */

import type { CharacterTheme } from '../types.js';
import {
  FEMALE_FIRST_NAMES,
  MALE_FIRST_NAMES,
  LAST_NAMES,
  HEIGHTS,
  BUILDS,
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
  FOOT_SIZES,
  POSITIVE_TRAITS,
  NEUTRAL_TRAITS,
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
  SKIN_TEXTURES,
  BACKSTORY_TEMPLATES,
  SUMMARY_TEMPLATES_NEUTRAL,
} from '../pools/index.js';

/**
 * Base theme with default pools for all attributes.
 * Gender-neutral, uses combined name pools.
 */
export const BASE_THEME: CharacterTheme = {
  id: 'base',
  name: 'Base Theme',
  description: 'Default theme with balanced, random generation across all attributes.',

  // No default gender - will be randomly selected (omit property instead of undefined)

  basics: {
    firstNames: [...FEMALE_FIRST_NAMES, ...MALE_FIRST_NAMES],
    lastNames: LAST_NAMES,
    ageRange: [18, 65],
    summaryTemplates: SUMMARY_TEMPLATES_NEUTRAL,
    backstoryTemplates: BACKSTORY_TEMPLATES,
    personalityTraits: [...POSITIVE_TRAITS, ...NEUTRAL_TRAITS],
  },

  appearance: {
    heights: HEIGHTS,
    builds: BUILDS,
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
    footSizes: FOOT_SIZES,
  },

  personality: {
    traits: [...POSITIVE_TRAITS, ...NEUTRAL_TRAITS],
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
      scentPrimaries: BODY_SCENTS,
      scentNotes: HAIR_SCENTS,
      texturePrimaries: SKIN_TEXTURES,
    },
    regionPopulationRate: 0.3, // 30% chance to populate each region
  },

  details: {
    labels: {
      preference: ['favorite color', 'favorite food', 'favorite music', 'favorite season'],
      ability: ['skilled at', 'talented in', 'natural ability'],
      history: ['significant memory', 'childhood experience', 'turning point'],
    },
    values: {
      preference: [
        'blue',
        'green',
        'purple',
        'red',
        'black',
        'Italian food',
        'sushi',
        'comfort food',
        'indie music',
        'classical',
        'pop',
        'autumn',
        'spring',
        'summer',
      ],
      ability: [
        'cooking',
        'art',
        'music',
        'writing',
        'sports',
        'languages',
        'problem-solving',
        'empathy',
      ],
      history: [
        'a memorable trip',
        'meeting their best friend',
        'a proud achievement',
        'overcoming a fear',
      ],
    },
    countRange: [2, 5],
    focusAreas: ['preference', 'ability'],
  },

  defaultTags: ['generated'],
};
