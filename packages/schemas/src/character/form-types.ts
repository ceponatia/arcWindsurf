import {
  CHARACTER_DETAIL_AREAS,
  BODY_REGIONS,
  APPEARANCE_REGIONS,
  PERSONALITY_DIMENSIONS,
  CORE_EMOTIONS,
  EMOTION_INTENSITIES,
  ATTACHMENT_STYLES,
  CORE_VALUES,
  FEAR_CATEGORIES,
  COPING_MECHANISMS,
  STRANGER_DEFAULTS,
  WARMTH_RATES,
  SOCIAL_ROLES,
  CONFLICT_STYLES,
  CRITICISM_RESPONSES,
  BOUNDARY_TYPES,
  VOCABULARY_LEVELS,
  SENTENCE_STRUCTURES,
  FORMALITY_LEVELS,
  HUMOR_FREQUENCIES,
  HUMOR_TYPES,
  EXPRESSIVENESS_LEVELS,
  DIRECTNESS_LEVELS,
  PACE_LEVELS,
  STRESS_RESPONSES,
  RECOVERY_RATES,
  type CharacterDetailArea,
  type BodyRegion,
  type BodyMap,
  type AppearanceRegion,
  type PersonalityDimension,
  type CoreEmotion,
  type EmotionIntensity,
  type AttachmentStyle,
  type CoreValue,
  type FearCategory,
  type CopingMechanism,
} from '../index.js';

export type CharacterBuilderMode = 'quick' | 'standard' | 'advanced';

export interface ModeConfig {
  label: string;
  description: string;
  fieldCount: string;
  sections: {
    basics: boolean;
    appearance: boolean;
    personality: boolean;
    body: boolean;
    details: boolean;
  };
  basicFields: {
    name: boolean;
    age: boolean;
    gender: boolean;
    race: boolean;
    alignment: boolean;
    summary: boolean;
    backstory: boolean;
    tags: boolean;
    profilePic: boolean;
    personality: boolean;
  };
}

export const MODE_CONFIGS: Record<CharacterBuilderMode, ModeConfig> = {
  quick: {
    label: 'Quick',
    description: 'Essential character info',
    fieldCount: '5 fields',
    sections: {
      basics: true,
      appearance: false,
      personality: false,
      body: false,
      details: false,
    },
    basicFields: {
      name: true,
      age: true,
      gender: true,
      race: true,
      alignment: true,
      summary: true,
      backstory: false,
      tags: false,
      profilePic: true,
      personality: false,
    },
  },
  standard: {
    label: 'Standard',
    description: 'Common character details',
    fieldCount: '~20 fields',
    sections: {
      basics: true,
      appearance: true,
      personality: true,
      body: false,
      details: false,
    },
    basicFields: {
      name: true,
      age: true,
      gender: true,
      race: true,
      alignment: true,
      summary: true,
      backstory: true,
      tags: true,
      profilePic: true,
      personality: true,
    },
  },
  advanced: {
    label: 'Advanced',
    description: 'Full character profile',
    fieldCount: '~100 fields',
    sections: {
      basics: true,
      appearance: true,
      personality: true,
      body: true,
      details: true,
    },
    basicFields: {
      name: true,
      age: true,
      gender: true,
      race: true,
      alignment: true,
      summary: true,
      backstory: true,
      tags: true,
      profilePic: true,
      personality: true,
    },
  },
};

export interface DetailFormEntry {
  label: string;
  value: string;
  area: CharacterDetailArea;
  importance: string;
  tags: string;
  notes: string;
}

export interface BodySensoryEntry {
  region: BodyRegion;
  type: 'scent' | 'texture' | 'flavor';
  raw: string;
}

export interface AppearanceEntry {
  region: AppearanceRegion;
  attribute: string;
  value: string;
}

export interface DimensionEntry {
  dimension: PersonalityDimension;
  score: number;
}

export interface ValueEntry {
  value: CoreValue;
  priority: number;
}

export interface FearEntry {
  category: FearCategory;
  specific: string;
  intensity: number;
  triggers: string;
  copingMechanism: CopingMechanism;
}

export interface EmotionalBaselineEntry {
  current: CoreEmotion;
  intensity: EmotionIntensity;
  blend?: CoreEmotion;
  moodBaseline: CoreEmotion;
  moodStability: number;
}

export interface SocialPatternEntry {
  strangerDefault: (typeof STRANGER_DEFAULTS)[number];
  warmthRate: (typeof WARMTH_RATES)[number];
  preferredRole: (typeof SOCIAL_ROLES)[number];
  conflictStyle: (typeof CONFLICT_STYLES)[number];
  criticismResponse: (typeof CRITICISM_RESPONSES)[number];
  boundaries: (typeof BOUNDARY_TYPES)[number];
}

export interface SpeechStyleEntry {
  vocabulary: (typeof VOCABULARY_LEVELS)[number];
  sentenceStructure: (typeof SENTENCE_STRUCTURES)[number];
  formality: (typeof FORMALITY_LEVELS)[number];
  humor: (typeof HUMOR_FREQUENCIES)[number];
  humorType?: (typeof HUMOR_TYPES)[number];
  expressiveness: (typeof EXPRESSIVENESS_LEVELS)[number];
  directness: (typeof DIRECTNESS_LEVELS)[number];
  pace: (typeof PACE_LEVELS)[number];
}

export interface StressBehaviorEntry {
  primary: (typeof STRESS_RESPONSES)[number];
  secondary?: (typeof STRESS_RESPONSES)[number];
  threshold: number;
  recoveryRate: (typeof RECOVERY_RATES)[number];
  soothingActivities: string;
  stressIndicators: string;
}

export interface PersonalityFormState {
  traits: string;
  dimensions: DimensionEntry[];
  emotionalBaseline: EmotionalBaselineEntry;
  values: ValueEntry[];
  fears: FearEntry[];
  attachment: AttachmentStyle;
  social: SocialPatternEntry;
  speech: SpeechStyleEntry;
  stress: StressBehaviorEntry;
}

export interface FormState {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  race: string;
  alignment: string;
  summary: string;
  backstory: string;
  tags: string;
  profilePic: string;
  personality: string;
  personalityMap: PersonalityFormState;
  appearance: string;
  body: BodyMap;
  details: DetailFormEntry[];
}

export type FormKey = keyof FormState;
export type FormFieldErrors = Partial<Record<FormKey, string>>;
export type UpdateFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const SENSORY_TYPES = ['scent', 'texture', 'flavor'] as const;
export type SensoryType = (typeof SENSORY_TYPES)[number];

export const createDetailEntry = (): DetailFormEntry => ({
  label: '',
  value: '',
  area: CHARACTER_DETAIL_AREAS[0],
  importance: '0.5',
  tags: '',
  notes: '',
});

export const createBodySensoryEntry = (): BodySensoryEntry => ({
  region: BODY_REGIONS[0],
  type: 'scent',
  raw: '',
});

export const createAppearanceEntry = (): AppearanceEntry => ({
  region: APPEARANCE_REGIONS[0],
  attribute: 'height',
  value: '',
});

export const createDimensionEntry = (
  dimension: PersonalityDimension = PERSONALITY_DIMENSIONS[0]
): DimensionEntry => ({
  dimension,
  score: 0.5,
});

export const createValueEntry = (): ValueEntry => ({
  value: CORE_VALUES[0],
  priority: 5,
});

export const createFearEntry = (): FearEntry => ({
  category: FEAR_CATEGORIES[0],
  specific: '',
  intensity: 0.5,
  triggers: '',
  copingMechanism: COPING_MECHANISMS[0],
});

export const createEmotionalBaselineEntry = (): EmotionalBaselineEntry => ({
  current: CORE_EMOTIONS[7], // anticipation
  intensity: EMOTION_INTENSITIES[0], // mild
  moodBaseline: CORE_EMOTIONS[1], // trust
  moodStability: 0.5,
});

export const createSocialPatternEntry = (): SocialPatternEntry => ({
  strangerDefault: STRANGER_DEFAULTS[1], // neutral
  warmthRate: WARMTH_RATES[1], // moderate
  preferredRole: SOCIAL_ROLES[1], // supporter
  conflictStyle: CONFLICT_STYLES[1], // diplomatic
  criticismResponse: CRITICISM_RESPONSES[1], // reflective
  boundaries: BOUNDARY_TYPES[1], // healthy
});

export const createSpeechStyleEntry = (): SpeechStyleEntry => ({
  vocabulary: VOCABULARY_LEVELS[1], // average
  sentenceStructure: SENTENCE_STRUCTURES[2], // moderate
  formality: FORMALITY_LEVELS[1], // neutral
  humor: HUMOR_FREQUENCIES[2], // occasional
  expressiveness: EXPRESSIVENESS_LEVELS[2], // moderate
  directness: DIRECTNESS_LEVELS[1], // direct
  pace: PACE_LEVELS[2], // moderate
});

export const createStressBehaviorEntry = (): StressBehaviorEntry => ({
  primary: STRESS_RESPONSES[2], // freeze
  threshold: 0.5,
  recoveryRate: RECOVERY_RATES[1], // moderate
  soothingActivities: '',
  stressIndicators: '',
});

export const createPersonalityFormState = (): PersonalityFormState => ({
  traits: '',
  dimensions: PERSONALITY_DIMENSIONS.map((d) => createDimensionEntry(d)),
  emotionalBaseline: createEmotionalBaselineEntry(),
  values: [],
  fears: [],
  attachment: ATTACHMENT_STYLES[0], // secure
  social: createSocialPatternEntry(),
  speech: createSpeechStyleEntry(),
  stress: createStressBehaviorEntry(),
});

export const createInitialState = (): FormState => ({
  id: '',
  name: '',
  age: 21,
  gender: '',
  race: 'Human',
  alignment: 'True Neutral',
  summary: '',
  backstory: '',
  tags: '',
  profilePic: '',
  personality: '',
  personalityMap: createPersonalityFormState(),
  appearance: '',
  body: {},
  details: [createDetailEntry()],
});
