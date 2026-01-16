import { getRecordOptional } from '../shared/record-helpers.js';
import { z } from 'zod';

/**
 * Personality Dimension Taxonomy
 * Based on the Big Five (OCEAN) model, with facets and prompt injection support.
 * Enables:
 * - Atomic personality traits that map to LLM prompt fragments
 * - Conflict detection between incompatible traits
 * - Relationship-aware trait modulation
 * - Natural language aliasing for trait resolution
 */

/**
 * Big Five personality dimensions - the foundation layer.
 * Each dimension is a spectrum from 0 (low) to 1 (high).
 */
export const PERSONALITY_DIMENSIONS = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'neuroticism',
] as const;

export type PersonalityDimension = (typeof PERSONALITY_DIMENSIONS)[number];

/**
 * Facets for each Big Five dimension - the granular layer.
 * Each facet represents a specific aspect of the parent dimension.
 */
export const PERSONALITY_FACETS: Record<PersonalityDimension, readonly string[]> = {
  openness: [
    'imagination',
    'artistic',
    'emotionality',
    'adventurousness',
    'intellect',
    'liberalism',
  ],
  conscientiousness: [
    'self-efficacy',
    'orderliness',
    'dutifulness',
    'achievement',
    'self-discipline',
    'cautiousness',
  ],
  extraversion: [
    'friendliness',
    'gregariousness',
    'assertiveness',
    'activity',
    'excitement-seeking',
    'cheerfulness',
  ],
  agreeableness: ['trust', 'morality', 'altruism', 'cooperation', 'modesty', 'sympathy'],
  neuroticism: [
    'anxiety',
    'anger',
    'depression',
    'self-consciousness',
    'immoderation',
    'vulnerability',
  ],
} as const;

// Trait Aliases (Natural Language Mapping)

/**
 * Maps natural language trait words to their personality dimension/facet.
 * Used for parsing character descriptions and resolving user input.
 */
export const TRAIT_ALIASES: Record<
  string,
  { dimension: PersonalityDimension; facet?: string; polarity: 'high' | 'low' }
> = {
  // Openness - high
  creative: { dimension: 'openness', facet: 'imagination', polarity: 'high' },
  imaginative: { dimension: 'openness', facet: 'imagination', polarity: 'high' },
  curious: { dimension: 'openness', facet: 'intellect', polarity: 'high' },
  adventurous: { dimension: 'openness', facet: 'adventurousness', polarity: 'high' },
  artistic: { dimension: 'openness', facet: 'artistic', polarity: 'high' },
  // Openness - low
  traditional: { dimension: 'openness', polarity: 'low' },
  conventional: { dimension: 'openness', polarity: 'low' },
  practical: { dimension: 'openness', facet: 'imagination', polarity: 'low' },

  // Conscientiousness - high
  organized: { dimension: 'conscientiousness', facet: 'orderliness', polarity: 'high' },
  reliable: { dimension: 'conscientiousness', facet: 'dutifulness', polarity: 'high' },
  ambitious: { dimension: 'conscientiousness', facet: 'achievement', polarity: 'high' },
  disciplined: { dimension: 'conscientiousness', facet: 'self-discipline', polarity: 'high' },
  careful: { dimension: 'conscientiousness', facet: 'cautiousness', polarity: 'high' },
  meticulous: { dimension: 'conscientiousness', facet: 'orderliness', polarity: 'high' },
  perfectionist: { dimension: 'conscientiousness', facet: 'orderliness', polarity: 'high' },
  // Conscientiousness - low
  spontaneous: { dimension: 'conscientiousness', polarity: 'low' },
  flexible: { dimension: 'conscientiousness', polarity: 'low' },
  chaotic: { dimension: 'conscientiousness', facet: 'orderliness', polarity: 'low' },
  messy: { dimension: 'conscientiousness', facet: 'orderliness', polarity: 'low' },
  disorganized: { dimension: 'conscientiousness', facet: 'orderliness', polarity: 'low' },
  impulsive: { dimension: 'conscientiousness', facet: 'cautiousness', polarity: 'low' },
  reckless: { dimension: 'conscientiousness', facet: 'cautiousness', polarity: 'low' },

  // Extraversion - high
  outgoing: { dimension: 'extraversion', facet: 'gregariousness', polarity: 'high' },
  sociable: { dimension: 'extraversion', facet: 'friendliness', polarity: 'high' },
  assertive: { dimension: 'extraversion', facet: 'assertiveness', polarity: 'high' },
  energetic: { dimension: 'extraversion', facet: 'activity', polarity: 'high' },
  enthusiastic: { dimension: 'extraversion', facet: 'cheerfulness', polarity: 'high' },
  warm: { dimension: 'extraversion', facet: 'friendliness', polarity: 'high' },
  friendly: { dimension: 'extraversion', facet: 'friendliness', polarity: 'high' },
  // Extraversion - low
  reserved: { dimension: 'extraversion', polarity: 'low' },
  introverted: { dimension: 'extraversion', polarity: 'low' },
  shy: { dimension: 'extraversion', polarity: 'low' },
  quiet: { dimension: 'extraversion', polarity: 'low' },
  solitary: { dimension: 'extraversion', facet: 'gregariousness', polarity: 'low' },
  withdrawn: { dimension: 'extraversion', polarity: 'low' },
  aloof: { dimension: 'extraversion', facet: 'friendliness', polarity: 'low' },
  cold: { dimension: 'extraversion', facet: 'friendliness', polarity: 'low' },

  // Agreeableness - high
  trusting: { dimension: 'agreeableness', facet: 'trust', polarity: 'high' },
  helpful: { dimension: 'agreeableness', facet: 'altruism', polarity: 'high' },
  kind: { dimension: 'agreeableness', facet: 'altruism', polarity: 'high' },
  cooperative: { dimension: 'agreeableness', facet: 'cooperation', polarity: 'high' },
  humble: { dimension: 'agreeableness', facet: 'modesty', polarity: 'high' },
  empathetic: { dimension: 'agreeableness', facet: 'sympathy', polarity: 'high' },
  compassionate: { dimension: 'agreeableness', facet: 'sympathy', polarity: 'high' },
  generous: { dimension: 'agreeableness', facet: 'altruism', polarity: 'high' },
  // Agreeableness - low
  competitive: { dimension: 'agreeableness', polarity: 'low' },
  skeptical: { dimension: 'agreeableness', facet: 'trust', polarity: 'low' },
  stubborn: { dimension: 'agreeableness', facet: 'cooperation', polarity: 'low' },
  suspicious: { dimension: 'agreeableness', facet: 'trust', polarity: 'low' },
  cynical: { dimension: 'agreeableness', facet: 'trust', polarity: 'low' },
  blunt: { dimension: 'agreeableness', facet: 'morality', polarity: 'low' },
  arrogant: { dimension: 'agreeableness', facet: 'modesty', polarity: 'low' },
  selfish: { dimension: 'agreeableness', facet: 'altruism', polarity: 'low' },

  // Neuroticism - high
  anxious: { dimension: 'neuroticism', facet: 'anxiety', polarity: 'high' },
  nervous: { dimension: 'neuroticism', facet: 'anxiety', polarity: 'high' },
  moody: { dimension: 'neuroticism', polarity: 'high' },
  temperamental: { dimension: 'neuroticism', facet: 'anger', polarity: 'high' },
  sensitive: { dimension: 'neuroticism', facet: 'vulnerability', polarity: 'high' },
  insecure: { dimension: 'neuroticism', facet: 'self-consciousness', polarity: 'high' },
  emotional: { dimension: 'neuroticism', polarity: 'high' },
  volatile: { dimension: 'neuroticism', facet: 'anger', polarity: 'high' },
  // Neuroticism - low
  calm: { dimension: 'neuroticism', polarity: 'low' },
  stable: { dimension: 'neuroticism', polarity: 'low' },
  resilient: { dimension: 'neuroticism', polarity: 'low' },
  composed: { dimension: 'neuroticism', polarity: 'low' },
  unflappable: { dimension: 'neuroticism', polarity: 'low' },
  confident: { dimension: 'neuroticism', facet: 'self-consciousness', polarity: 'low' },
};

// Emotional State System

export const CORE_EMOTIONS = [
  'joy',
  'trust',
  'fear',
  'surprise',
  'sadness',
  'disgust',
  'anger',
  'anticipation',
] as const;

export type CoreEmotion = (typeof CORE_EMOTIONS)[number];

export const EMOTION_INTENSITIES = ['mild', 'moderate', 'strong', 'intense'] as const;
export type EmotionIntensity = (typeof EMOTION_INTENSITIES)[number];

export const EmotionalStateSchema = z.object({
  /** Current primary emotion */
  current: z.enum(CORE_EMOTIONS).default('anticipation'),
  /** Intensity of current emotion */
  intensity: z.enum(EMOTION_INTENSITIES).default('mild'),
  /** Blend emotion if applicable */
  blend: z.enum(CORE_EMOTIONS).optional(),
  /** Mood baseline (what they return to) */
  moodBaseline: z.enum(CORE_EMOTIONS).default('trust'),
  /** Mood stability (0-1, high = hard to shift) */
  moodStability: z.number().min(0).max(1).default(0.5),
});

export type EmotionalState = z.infer<typeof EmotionalStateSchema>;

// Values & Motivations

export const CORE_VALUES = [
  // Achievement
  'success',
  'ambition',
  'competence',
  'influence',
  // Benevolence
  'loyalty',
  'honesty',
  'helpfulness',
  'forgiveness',
  // Tradition
  'respect',
  'devotion',
  'humility',
  'acceptance',
  // Security
  'safety',
  'stability',
  'order',
  // Power
  'authority',
  'wealth',
  'dominance',
  'prestige',
  // Hedonism
  'pleasure',
  'enjoyment',
  // Stimulation
  'excitement',
  'novelty',
  'challenge',
  // Self-direction
  'freedom',
  'creativity',
  'independence',
  'curiosity',
  // Universalism
  'equality',
  'justice',
  'tolerance',
  'wisdom',
] as const;

export type CoreValue = (typeof CORE_VALUES)[number];

export const ValueSchema = z.object({
  /** The core value */
  value: z.enum(CORE_VALUES),
  /** Priority rank (1 = highest) */
  priority: z.number().int().min(1).max(10).default(5),
});

export type Value = z.infer<typeof ValueSchema>;

// Fears

export const FEAR_CATEGORIES = [
  'loss',
  'failure',
  'rejection',
  'abandonment',
  'exposure',
  'helplessness',
  'death',
  'unknown',
  'change',
  'intimacy',
] as const;

export type FearCategory = (typeof FEAR_CATEGORIES)[number];

export const COPING_MECHANISMS = [
  'avoidance',
  'denial',
  'confrontation',
  'humor',
  'aggression',
] as const;
export type CopingMechanism = (typeof COPING_MECHANISMS)[number];

export const FearSchema = z.object({
  /** Category of fear */
  category: z.enum(FEAR_CATEGORIES),
  /** Specific manifestation */
  specific: z.string().min(1).max(200),
  /** How much it affects behavior (0-1) */
  intensity: z.number().min(0).max(1).default(0.5),
  /** What triggers this fear */
  triggers: z.array(z.string().min(1).max(100)).max(5).default([]),
  /** How they typically cope */
  copingMechanism: z.enum(COPING_MECHANISMS).default('avoidance'),
});

export type Fear = z.infer<typeof FearSchema>;

// Social Patterns

export const ATTACHMENT_STYLES = [
  'secure',
  'anxious-preoccupied',
  'dismissive-avoidant',
  'fearful-avoidant',
] as const;

export type AttachmentStyle = (typeof ATTACHMENT_STYLES)[number];

export const STRANGER_DEFAULTS = ['welcoming', 'neutral', 'guarded', 'hostile'] as const;
export const WARMTH_RATES = ['fast', 'moderate', 'slow', 'very-slow'] as const;
export const SOCIAL_ROLES = [
  'leader',
  'supporter',
  'advisor',
  'loner',
  'entertainer',
  'caretaker',
] as const;
export const CONFLICT_STYLES = [
  'confrontational',
  'diplomatic',
  'avoidant',
  'passive-aggressive',
  'collaborative',
] as const;
export const CRITICISM_RESPONSES = [
  'defensive',
  'reflective',
  'dismissive',
  'hurt',
  'grateful',
] as const;
export const BOUNDARY_TYPES = ['rigid', 'healthy', 'porous', 'nonexistent'] as const;

export const SocialPatternSchema = z.object({
  /** Default stance toward strangers */
  strangerDefault: z.enum(STRANGER_DEFAULTS).default('neutral'),
  /** How quickly they warm up to people */
  warmthRate: z.enum(WARMTH_RATES).default('moderate'),
  /** Preferred social role */
  preferredRole: z.enum(SOCIAL_ROLES).default('supporter'),
  /** Conflict style */
  conflictStyle: z.enum(CONFLICT_STYLES).default('diplomatic'),
  /** How they handle criticism */
  criticismResponse: z.enum(CRITICISM_RESPONSES).default('reflective'),
  /** Boundary setting */
  boundaries: z.enum(BOUNDARY_TYPES).default('healthy'),
});

export type SocialPattern = z.infer<typeof SocialPatternSchema>;

// Speech Style

export const VOCABULARY_LEVELS = ['simple', 'average', 'educated', 'erudite', 'archaic'] as const;
export const SENTENCE_STRUCTURES = ['terse', 'simple', 'moderate', 'complex', 'elaborate'] as const;
export const FORMALITY_LEVELS = ['casual', 'neutral', 'formal', 'ritualistic'] as const;
export const HUMOR_LEVELS = ['none', 'rare', 'occasional', 'frequent', 'constant'] as const;;
export const HUMOR_TYPES = [
  'dry',
  'sarcastic',
  'witty',
  'slapstick',
  'dark',
  'self-deprecating',
] as const;
export const EXPRESSIVENESS_LEVELS = [
  'stoic',
  'reserved',
  'moderate',
  'expressive',
  'dramatic',
] as const;
export const DIRECTNESS_LEVELS = ['blunt', 'direct', 'tactful', 'indirect', 'evasive'] as const;
export const PACE_LEVELS = ['slow', 'measured', 'moderate', 'quick', 'rapid'] as const;

export const SpeechStyleSchema = z.object({
  /** Vocabulary level */
  vocabulary: z.enum(VOCABULARY_LEVELS).default('average'),
  /** Sentence complexity */
  sentenceStructure: z.enum(SENTENCE_STRUCTURES).default('moderate'),
  /** Formality default */
  formality: z.enum(FORMALITY_LEVELS).default('neutral'),
  /** Use of humor */
  humor: z.enum(HUMOR_LEVELS).default('occasional'),
  /** Humor type when used */
  humorType: z.enum(HUMOR_TYPES).optional(),
  /** Emotional expressiveness in speech */
  expressiveness: z.enum(EXPRESSIVENESS_LEVELS).default('moderate'),
  /** Directness */
  directness: z.enum(DIRECTNESS_LEVELS).default('direct'),
  /** Pace of speech */
  pace: z.enum(PACE_LEVELS).default('moderate'),
});

export type SpeechStyle = z.infer<typeof SpeechStyleSchema>;

// Stress Response

export const STRESS_RESPONSES = ['fight', 'flight', 'freeze', 'fawn'] as const;
export type StressResponse = (typeof STRESS_RESPONSES)[number];

export const RECOVERY_RATES = ['slow', 'moderate', 'fast'] as const;

export const StressBehaviorSchema = z.object({
  /** Primary stress response */
  primary: z.enum(STRESS_RESPONSES).default('freeze'),
  /** Secondary stress response */
  secondary: z.enum(STRESS_RESPONSES).optional(),
  /** Stress threshold (0-1, low = easily stressed) */
  threshold: z.number().min(0).max(1).default(0.5),
  /** Recovery rate */
  recoveryRate: z.enum(RECOVERY_RATES).default('moderate'),
  /** What helps them calm down */
  soothingActivities: z.array(z.string().min(1).max(50)).max(5).default([]),
  /** Red flags that they're stressed */
  stressIndicators: z.array(z.string().min(1).max(100)).max(5).default([]),
});

export type StressBehavior = z.infer<typeof StressBehaviorSchema>;

// Prompt Injection System

/**
 * Categories for trait prompts - used for budgeting.
 */
export const PROMPT_CATEGORIES = [
  'social',
  'communication',
  'emotional',
  'behavioral',
  'cognitive',
  'speech',
  'decision',
  'stress',
  'relational',
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

/**
 * A trait prompt maps a trait ID to an LLM-injectable prompt fragment.
 */
export interface TraitPrompt {
  /** The prompt fragment to inject (10-25 words ideal) */
  prompt: string;
  /** Category for grouping and potential limits */
  category: PromptCategory;
  /** Trait IDs that cannot coexist with this trait */
  conflicts: string[];
}

/**
 * Maps trait identifiers to their prompt injection fragments.
 * These are combined at runtime based on the character's personality map.
 */
export const TRAIT_PROMPTS: Record<string, TraitPrompt> = {
  // Friendliness spectrum
  'friendliness:high': {
    prompt: 'Greet others warmly. Use welcoming language and show genuine interest in them.',
    category: 'social',
    conflicts: ['friendliness:low', 'hostile', 'cold'],
  },
  'friendliness:low': {
    prompt: 'Keep greetings brief and functional. Do not volunteer personal warmth.',
    category: 'social',
    conflicts: ['friendliness:high', 'warm', 'effusive'],
  },

  // Gregariousness spectrum
  'gregariousness:high': {
    prompt: 'Seek conversation and company. Dislike being alone. Initiate social interaction.',
    category: 'social',
    conflicts: ['gregariousness:low', 'solitary', 'reclusive'],
  },
  'gregariousness:low': {
    prompt: 'Prefer solitude or one-on-one interaction. Find crowds draining.',
    category: 'social',
    conflicts: ['gregariousness:high', 'social-butterfly'],
  },

  // Assertiveness spectrum
  'assertiveness:high': {
    prompt: 'Speak with confidence. Take charge in conversations. Express opinions directly.',
    category: 'communication',
    conflicts: ['assertiveness:low', 'meek', 'passive'],
  },
  'assertiveness:low': {
    prompt:
      'Defer to others in conversation. Hesitate before asserting views. Use hedging language.',
    category: 'communication',
    conflicts: ['assertiveness:high', 'dominant', 'commanding'],
  },

  // Trust spectrum
  'trust:high': {
    prompt: 'Give others benefit of the doubt. Accept claims at face value initially.',
    category: 'social',
    conflicts: ['trust:low', 'paranoid', 'suspicious'],
  },
  'trust:low': {
    prompt: "Question others' motives. Look for hidden agendas. Require proof.",
    category: 'social',
    conflicts: ['trust:high', 'naive', 'gullible'],
  },

  // Altruism spectrum
  'altruism:high': {
    prompt: "Offer help unprompted. Prioritize others' needs. Show genuine concern.",
    category: 'behavioral',
    conflicts: ['altruism:low', 'selfish', 'self-centered'],
  },
  'altruism:low': {
    prompt: 'Focus on own needs first. Help only when directly asked or when beneficial.',
    category: 'behavioral',
    conflicts: ['altruism:high', 'selfless', 'martyr'],
  },

  // Modesty spectrum
  'modesty:high': {
    prompt: 'Downplay achievements. Deflect praise. Avoid bragging or showing off.',
    category: 'communication',
    conflicts: ['modesty:low', 'boastful', 'arrogant'],
  },
  'modesty:low': {
    prompt: 'Speak confidently about accomplishments. Accept praise readily. Know your worth.',
    category: 'communication',
    conflicts: ['modesty:high', 'self-deprecating'],
  },

  // Orderliness spectrum
  'orderliness:high': {
    prompt: 'Prefer structure and plans. Notice disorder. Reference schedules or organization.',
    category: 'behavioral',
    conflicts: ['orderliness:low', 'chaotic', 'messy'],
  },
  'orderliness:low': {
    prompt: 'Go with the flow. Ignore minor disorder. Resist rigid schedules.',
    category: 'behavioral',
    conflicts: ['orderliness:high', 'rigid', 'uptight'],
  },

  // Cautiousness spectrum
  'cautiousness:high': {
    prompt: 'Think before acting. Consider consequences. Ask clarifying questions.',
    category: 'decision',
    conflicts: ['cautiousness:low', 'reckless', 'impulsive'],
  },
  'cautiousness:low': {
    prompt: "Act on instinct. Decide quickly. Don't overthink.",
    category: 'decision',
    conflicts: ['cautiousness:high', 'overcautious', 'paralyzed'],
  },

  // Anxiety spectrum
  'anxiety:high': {
    prompt: 'Express worry about outcomes. Anticipate problems. Show nervous mannerisms.',
    category: 'emotional',
    conflicts: ['anxiety:low', 'carefree', 'unworried'],
  },
  'anxiety:low': {
    prompt: "Remain calm under pressure. Don't dwell on potential problems. Appear relaxed.",
    category: 'emotional',
    conflicts: ['anxiety:high', 'paranoid', 'panicky'],
  },

  // Imagination spectrum
  'imagination:high': {
    prompt: 'Reference hypotheticals, stories, or what-ifs. Think abstractly. Daydream aloud.',
    category: 'cognitive',
    conflicts: ['imagination:low', 'literal', 'concrete'],
  },
  'imagination:low': {
    prompt: 'Focus on concrete facts. Dismiss hypotheticals. Stay grounded in reality.',
    category: 'cognitive',
    conflicts: ['imagination:high', 'fanciful', 'dreamy'],
  },

  // Speech style prompts
  'speech:terse': {
    prompt: 'Use short sentences. Avoid elaboration. Get to the point quickly.',
    category: 'speech',
    conflicts: ['speech:elaborate', 'speech:verbose'],
  },
  'speech:elaborate': {
    prompt: 'Use rich descriptions. Speak in longer, flowing sentences. Elaborate on details.',
    category: 'speech',
    conflicts: ['speech:terse', 'speech:simple'],
  },
  'speech:formal': {
    prompt: 'Use proper grammar and respectful address. Avoid slang and contractions.',
    category: 'speech',
    conflicts: ['speech:casual', 'speech:crude'],
  },
  'speech:casual': {
    prompt: 'Speak naturally with contractions and colloquialisms. Relax grammar rules.',
    category: 'speech',
    conflicts: ['speech:formal', 'speech:ritualistic'],
  },
  'speech:blunt': {
    prompt: "Say exactly what you mean. Don't soften harsh truths. Skip pleasantries.",
    category: 'speech',
    conflicts: ['speech:evasive', 'speech:indirect'],
  },
  'speech:evasive': {
    prompt: 'Avoid direct answers. Deflect with questions. Leave things ambiguous.',
    category: 'speech',
    conflicts: ['speech:blunt', 'speech:direct'],
  },

  // Humor prompts
  'humor:dry': {
    prompt: 'Deliver jokes with a straight face. Use understatement and deadpan timing.',
    category: 'speech',
    conflicts: ['humor:none', 'humor:slapstick'],
  },
  'humor:sarcastic': {
    prompt: 'Use irony and mock sincerity. Say the opposite of what you mean for effect.',
    category: 'speech',
    conflicts: ['humor:none', 'humor:sincere'],
  },
  'humor:dark': {
    prompt: 'Find humor in morbid or taboo topics. Joke about uncomfortable subjects.',
    category: 'speech',
    conflicts: ['humor:none', 'humor:wholesome'],
  },
  'humor:none': {
    prompt: 'Take things seriously. Do not make jokes or use humor to deflect.',
    category: 'speech',
    conflicts: ['humor:constant', 'humor:frequent'],
  },

  // Stress response prompts
  'stress:fight': {
    prompt: 'Under pressure, become more confrontational. Push back. Stand ground.',
    category: 'stress',
    conflicts: ['stress:flight', 'stress:fawn'],
  },
  'stress:flight': {
    prompt: 'Under pressure, seek escape. Change subject. Find excuses to leave.',
    category: 'stress',
    conflicts: ['stress:fight', 'stress:freeze'],
  },
  'stress:freeze': {
    prompt: 'Under pressure, become quiet and still. Struggle to respond. Shut down.',
    category: 'stress',
    conflicts: ['stress:fight', 'stress:fawn'],
  },
  'stress:fawn': {
    prompt: 'Under pressure, become accommodating. Agree with others. Prioritize harmony.',
    category: 'stress',
    conflicts: ['stress:fight', 'stress:freeze'],
  },

  // Attachment style prompts
  'attachment:secure': {
    prompt:
      'Comfortable with closeness and independence. Trust comes naturally. Communicate openly.',
    category: 'relational',
    conflicts: ['attachment:anxious', 'attachment:avoidant'],
  },
  'attachment:anxious': {
    prompt: 'Crave reassurance. Worry about abandonment. Read into silences and absences.',
    category: 'relational',
    conflicts: ['attachment:secure', 'attachment:dismissive'],
  },
  'attachment:dismissive': {
    prompt: 'Value independence highly. Keep emotional distance. Minimize need for others.',
    category: 'relational',
    conflicts: ['attachment:secure', 'attachment:anxious'],
  },
  'attachment:fearful': {
    prompt: 'Want closeness but fear it. Push-pull in relationships. Guard vulnerability.',
    category: 'relational',
    conflicts: ['attachment:secure'],
  },
};

// Trait Conflict System

export type ConflictType = 'polar' | 'logical' | 'behavioral' | 'soft';

export interface TraitConflict {
  trait1: string;
  trait2: string;
  type: ConflictType;
  /** For soft conflicts, describe when they CAN coexist */
  exception?: string;
}

/**
 * Comprehensive conflict rules between traits.
 */
export const TRAIT_CONFLICTS: TraitConflict[] = [
  // Polar opposites
  { trait1: 'friendliness:high', trait2: 'friendliness:low', type: 'polar' },
  { trait1: 'gregariousness:high', trait2: 'gregariousness:low', type: 'polar' },
  { trait1: 'assertiveness:high', trait2: 'assertiveness:low', type: 'polar' },
  { trait1: 'trust:high', trait2: 'trust:low', type: 'polar' },
  { trait1: 'altruism:high', trait2: 'altruism:low', type: 'polar' },
  { trait1: 'modesty:high', trait2: 'modesty:low', type: 'polar' },
  { trait1: 'orderliness:high', trait2: 'orderliness:low', type: 'polar' },
  { trait1: 'cautiousness:high', trait2: 'cautiousness:low', type: 'polar' },
  { trait1: 'anxiety:high', trait2: 'anxiety:low', type: 'polar' },
  { trait1: 'imagination:high', trait2: 'imagination:low', type: 'polar' },

  // Logical contradictions
  { trait1: 'trust:high', trait2: 'paranoid', type: 'logical' },
  { trait1: 'trust:high', trait2: 'suspicious', type: 'logical' },
  { trait1: 'orderliness:high', trait2: 'chaotic', type: 'logical' },
  { trait1: 'orderliness:high', trait2: 'messy', type: 'logical' },
  { trait1: 'modesty:high', trait2: 'arrogant', type: 'logical' },
  { trait1: 'modesty:high', trait2: 'boastful', type: 'logical' },

  // Behavioral clashes
  { trait1: 'speech:terse', trait2: 'speech:elaborate', type: 'behavioral' },
  { trait1: 'speech:formal', trait2: 'speech:casual', type: 'behavioral' },
  { trait1: 'speech:blunt', trait2: 'speech:evasive', type: 'behavioral' },
  { trait1: 'stress:fight', trait2: 'stress:flight', type: 'behavioral' },
  { trait1: 'stress:fight', trait2: 'stress:fawn', type: 'behavioral' },
  { trait1: 'stress:freeze', trait2: 'stress:fawn', type: 'behavioral' },
  { trait1: 'humor:none', trait2: 'humor:dry', type: 'behavioral' },
  { trait1: 'humor:none', trait2: 'humor:sarcastic', type: 'behavioral' },
  { trait1: 'attachment:secure', trait2: 'attachment:anxious', type: 'behavioral' },
  { trait1: 'attachment:secure', trait2: 'attachment:dismissive', type: 'behavioral' },

  // Soft conflicts
  {
    trait1: 'gregariousness:low',
    trait2: 'preferredRole:leader',
    type: 'soft',
    exception: 'Possible for reluctant leaders or those who lead from behind',
  },
  {
    trait1: 'anxiety:high',
    trait2: 'adventurousness:high',
    type: 'soft',
    exception: 'Possible for adrenaline junkies who cope with anxiety through action',
  },
];

// Complete Personality Map Schema

/**
 * Dimension scores schema - numeric values for each Big Five dimension.
 */
export const DimensionScoresSchema = z
  .object({
    openness: z.number().min(0).max(1).default(0.5),
    conscientiousness: z.number().min(0).max(1).default(0.5),
    extraversion: z.number().min(0).max(1).default(0.5),
    agreeableness: z.number().min(0).max(1).default(0.5),
    neuroticism: z.number().min(0).max(1).default(0.5),
  })
  .partial();

export type DimensionScores = z.infer<typeof DimensionScoresSchema>;

/**
 * Complete personality map with all optional facets.
 * Only include sections that are relevant to the character.
 */
export const PersonalityMapSchema = z.object({
  /** Core trait dimensions (Big Five scores) */
  dimensions: DimensionScoresSchema.optional(),

  /** Granular facet scores (optional, for deeper characterization) */
  facets: z.record(z.string(), z.number().min(0).max(1)).optional(),

  /** Simple trait keywords for quick personality summary */
  traits: z.array(z.string().min(1).max(50)).max(12).optional(),

  /** Emotional baseline */
  emotionalBaseline: EmotionalStateSchema.optional(),

  /** Core values (prioritized list) */
  values: z.array(ValueSchema).max(5).optional(),

  /** Fears and triggers */
  fears: z.array(FearSchema).max(4).optional(),

  /** Attachment style */
  attachment: z.enum(ATTACHMENT_STYLES).optional(),

  /** Social behavior patterns */
  social: SocialPatternSchema.optional(),

  /** Speech and communication style */
  speech: SpeechStyleSchema.optional(),

  /** Stress response patterns */
  stress: StressBehaviorSchema.optional(),
});

export type PersonalityMap = z.infer<typeof PersonalityMapSchema>;

// Helper Functions

/**
 * Resolve a trait keyword to its personality dimension.
 */
export function resolveTraitToDimension(
  trait: string
): { dimension: PersonalityDimension; facet?: string; polarity: 'high' | 'low' } | undefined {
  const normalized = trait.toLowerCase().trim();
  return getRecordOptional(TRAIT_ALIASES, normalized);
}

/**
 * Check if a string is a valid trait reference.
 */
export function isTraitReference(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return normalized in TRAIT_ALIASES;
}

/**
 * Check if two traits conflict.
 */
export function checkTraitConflict(trait1: string, trait2: string): TraitConflict | undefined {
  return TRAIT_CONFLICTS.find(
    (c) =>
      (c.trait1 === trait1 && c.trait2 === trait2) || (c.trait1 === trait2 && c.trait2 === trait1)
  );
}

/**
 * Validate a set of traits and return all conflicts.
 */
export function validateTraitSet(traits: string[]): {
  valid: boolean;
  hardConflicts: TraitConflict[];
  softConflicts: TraitConflict[];
} {
  const hardConflicts: TraitConflict[] = [];
  const softConflicts: TraitConflict[] = [];

  traits.forEach((trait1, i) => {
    traits.slice(i + 1).forEach((trait2) => {
      const conflict = checkTraitConflict(trait1, trait2);
      if (conflict) {
        if (conflict.type === 'soft') {
          softConflicts.push(conflict);
        } else {
          hardConflicts.push(conflict);
        }
      }
    });
  });

  return {
    valid: hardConflicts.length === 0,
    hardConflicts,
    softConflicts,
  };
}

/**
 * Get all traits that are compatible with a given trait.
 */
export function getCompatibleTraits(selectedTrait: string, allTraits: string[]): string[] {
  const conflicting = new Set(
    TRAIT_CONFLICTS.filter((c) => c.trait1 === selectedTrait || c.trait2 === selectedTrait)
      .filter((c) => c.type !== 'soft')
      .map((c) => (c.trait1 === selectedTrait ? c.trait2 : c.trait1))
  );

  return allTraits.filter((t) => !conflicting.has(t));
}

/**
 * Get the prompt fragment for a trait ID.
 */
export function getTraitPrompt(traitId: string): TraitPrompt | undefined {
  return getRecordOptional(TRAIT_PROMPTS, traitId);
}

/**
 * Category budget limits for prompt assembly.
 */
export const CATEGORY_LIMITS: Record<PromptCategory, number> = {
  social: 2,
  communication: 2,
  emotional: 2,
  behavioral: 2,
  cognitive: 1,
  speech: 2,
  decision: 1,
  stress: 1,
  relational: 1,
};

/**
 * Get the opposite polarity trait ID for a given trait.
 */
export function getOppositeTraitId(traitId: string): string | undefined {
  const [facet, polarity] = traitId.split(':');
  if (!facet || !polarity) return undefined;
  const oppositePolarity = polarity === 'high' ? 'low' : 'high';
  const opposite = `${facet}:${oppositePolarity}`;
  return getRecordOptional(TRAIT_PROMPTS, opposite) ? opposite : undefined;
}
