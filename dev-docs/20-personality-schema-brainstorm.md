# Personality Schema Brainstorm

> **Status**: IMPLEMENTED - see `packages/schemas/src/character/personality.ts`

This document outlines the design for a comprehensive `personality.ts` schema in `@minimal-rpg/schemas` that enables realistic, consistent NPC behavior when played by our DeepSeek LLM-based npc-agent system.

## Implementation Summary

The schema has been implemented with the following components:

- **Schema**: `packages/schemas/src/character/personality.ts`
  - Big Five dimensions with facets
  - Emotional states (Plutchik-based)
  - Values, fears, attachment styles
  - Social patterns, speech style, stress behavior
  - Trait prompt registry (`TRAIT_PROMPTS`)
  - Conflict detection (`validateTraitSet()`)
- **CharacterProfile Integration**: `personalityMap` field added to `CharacterProfileSchema`

- **Character Builder UI**: Full personality section in `packages/web/src/features/character-builder/components/PersonalitySection.tsx`
  - Big Five sliders
  - Emotional baseline selectors
  - Values and fears entry forms
  - Social patterns, speech style, stress behavior sections
  - Real-time trait conflict validation

## 1. Design Philosophy

### 1.1 Goals

Following the pattern established by `body.ts`, this schema should be:

- **Atomic & Composable**: Break personality into discrete, queryable facets that can be retrieved selectively
- **Taxonomy-Based**: Define canonical personality dimensions with aliasing for natural language parsing
- **Hierarchical**: Support both high-level personality summaries and granular trait specifications
- **Context-Aware**: Enable dynamic behavior based on situation, relationship, and emotional state
- **LLM-Optimized**: Structure data in ways that translate cleanly to system prompts

### 1.2 What Makes This Different from Typical Chatbot Personality

Most RP chatbots use flat trait lists or simple adjective arrays. Our system should model:

1. **Behavioral consistency across contexts** - An introvert behaves differently when alone vs. in crowds, but consistently
2. **Emotional dynamics** - Characters have moods that shift but within personality bounds
3. **Relationship-dependent behavior** - How they treat strangers vs. friends vs. enemies
4. **Motivation-driven responses** - Core values and fears that drive decision-making
5. **Speech patterns tied to personality** - Not just "what" they say but "how"
6. **Growth potential** - Personality can evolve over time through gameplay

## 2. Core Personality Dimensions (Trait Taxonomy)

### 2.1 Big Five Model (Foundation Layer)

The Big Five (OCEAN) provides a well-researched foundation for personality modeling:

```typescript
export const PERSONALITY_DIMENSIONS = [
  'openness', // creativity, curiosity, preference for novelty
  'conscientiousness', // organization, dependability, self-discipline
  'extraversion', // sociability, assertiveness, positive emotions
  'agreeableness', // cooperation, trust, altruism
  'neuroticism', // emotional instability, anxiety, moodiness
] as const;

export type PersonalityDimension = (typeof PERSONALITY_DIMENSIONS)[number];
```

Each dimension has a spectrum (0-1 or low/medium/high) with behavioral implications.

### 2.2 Trait Facets (Granular Layer)

Each Big Five dimension breaks into 6 facets:

```typescript
export const PERSONALITY_FACETS: Record<PersonalityDimension, readonly string[]> = {
  openness: [
    'imagination', // fantasy-prone vs. practical
    'artistic', // aesthetic sensitivity
    'emotionality', // emotional awareness
    'adventurousness', // novelty-seeking
    'intellect', // intellectual curiosity
    'liberalism', // value flexibility
  ],
  conscientiousness: [
    'self-efficacy', // confidence in abilities
    'orderliness', // preference for structure
    'dutifulness', // sense of obligation
    'achievement', // ambition
    'self-discipline', // impulse control
    'cautiousness', // deliberation before action
  ],
  extraversion: [
    'friendliness', // warmth toward others
    'gregariousness', // preference for company
    'assertiveness', // social dominance
    'activity', // energy level
    'excitement-seeking', // thrill-seeking
    'cheerfulness', // positive affect
  ],
  agreeableness: [
    'trust', // belief in others' honesty
    'morality', // straightforwardness
    'altruism', // concern for others
    'cooperation', // accommodation
    'modesty', // humility
    'sympathy', // empathy and compassion
  ],
  neuroticism: [
    'anxiety', // worry and fear
    'anger', // irritability
    'depression', // sadness, hopelessness
    'self-consciousness', // social anxiety
    'immoderation', // difficulty resisting urges
    'vulnerability', // susceptibility to stress
  ],
} as const;
```

### 2.3 Trait Aliases (Natural Language Mapping)

Similar to body.ts's `BODY_REGION_ALIASES`, we need aliases for natural language:

```typescript
export const TRAIT_ALIASES: Record<string, { dimension: PersonalityDimension; facet?: string }> = {
  // Openness aliases
  creative: { dimension: 'openness', facet: 'imagination' },
  imaginative: { dimension: 'openness', facet: 'imagination' },
  curious: { dimension: 'openness', facet: 'intellect' },
  adventurous: { dimension: 'openness', facet: 'adventurousness' },
  artistic: { dimension: 'openness', facet: 'artistic' },
  traditional: { dimension: 'openness' }, // low openness
  conventional: { dimension: 'openness' }, // low openness

  // Conscientiousness aliases
  organized: { dimension: 'conscientiousness', facet: 'orderliness' },
  reliable: { dimension: 'conscientiousness', facet: 'dutifulness' },
  ambitious: { dimension: 'conscientiousness', facet: 'achievement' },
  disciplined: { dimension: 'conscientiousness', facet: 'self-discipline' },
  careful: { dimension: 'conscientiousness', facet: 'cautiousness' },
  spontaneous: { dimension: 'conscientiousness' }, // low conscientiousness
  flexible: { dimension: 'conscientiousness' }, // low conscientiousness

  // Extraversion aliases
  outgoing: { dimension: 'extraversion', facet: 'gregariousness' },
  sociable: { dimension: 'extraversion', facet: 'friendliness' },
  assertive: { dimension: 'extraversion', facet: 'assertiveness' },
  energetic: { dimension: 'extraversion', facet: 'activity' },
  enthusiastic: { dimension: 'extraversion', facet: 'cheerfulness' },
  reserved: { dimension: 'extraversion' }, // low extraversion
  introverted: { dimension: 'extraversion' }, // low extraversion
  shy: { dimension: 'extraversion' }, // low extraversion
  quiet: { dimension: 'extraversion' }, // low extraversion

  // Agreeableness aliases
  trusting: { dimension: 'agreeableness', facet: 'trust' },
  helpful: { dimension: 'agreeableness', facet: 'altruism' },
  kind: { dimension: 'agreeableness', facet: 'altruism' },
  cooperative: { dimension: 'agreeableness', facet: 'cooperation' },
  humble: { dimension: 'agreeableness', facet: 'modesty' },
  empathetic: { dimension: 'agreeableness', facet: 'sympathy' },
  competitive: { dimension: 'agreeableness' }, // low agreeableness
  skeptical: { dimension: 'agreeableness' }, // low agreeableness
  stubborn: { dimension: 'agreeableness' }, // low agreeableness

  // Neuroticism aliases
  anxious: { dimension: 'neuroticism', facet: 'anxiety' },
  nervous: { dimension: 'neuroticism', facet: 'anxiety' },
  moody: { dimension: 'neuroticism' },
  temperamental: { dimension: 'neuroticism', facet: 'anger' },
  sensitive: { dimension: 'neuroticism', facet: 'vulnerability' },
  calm: { dimension: 'neuroticism' }, // low neuroticism
  stable: { dimension: 'neuroticism' }, // low neuroticism
  resilient: { dimension: 'neuroticism' }, // low neuroticism
};
```

## 3. Emotional State System

### 3.1 Core Emotions (Plutchik's Wheel)

```typescript
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
```

### 3.2 Emotional Intensity & Blends

```typescript
export const EMOTION_INTENSITIES = ['mild', 'moderate', 'strong', 'intense'] as const;
export type EmotionIntensity = (typeof EMOTION_INTENSITIES)[number];

// Complex emotions as blends (Plutchik dyads)
export const EMOTION_BLENDS: Record<string, [CoreEmotion, CoreEmotion]> = {
  love: ['joy', 'trust'],
  submission: ['trust', 'fear'],
  awe: ['fear', 'surprise'],
  disapproval: ['surprise', 'sadness'],
  remorse: ['sadness', 'disgust'],
  contempt: ['disgust', 'anger'],
  aggressiveness: ['anger', 'anticipation'],
  optimism: ['anticipation', 'joy'],
};
```

### 3.3 Mood vs. Emotion vs. Temperament

```typescript
// Temperament: baseline emotional tendencies (trait-level, stable)
// Mood: medium-term emotional state (hours to days)
// Emotion: immediate emotional response (seconds to minutes)

export interface EmotionalState {
  /** Current primary emotion */
  current: CoreEmotion;
  /** Intensity of current emotion */
  intensity: EmotionIntensity;
  /** Blend emotion if applicable */
  blend?: CoreEmotion;
  /** Mood baseline (what they return to) */
  moodBaseline: CoreEmotion;
  /** Mood stability (how easily shifted) */
  moodStability: number; // 0-1, high = hard to shift
}
```

## 4. Values, Motivations & Fears

### 4.1 Core Values Taxonomy

```typescript
export const CORE_VALUES = [
  // Achievement values
  'success',
  'ambition',
  'competence',
  'influence',

  // Benevolence values
  'loyalty',
  'honesty',
  'helpfulness',
  'forgiveness',

  // Tradition values
  'respect',
  'devotion',
  'modesty',
  'acceptance',

  // Security values
  'safety',
  'stability',
  'order',
  'cleanliness',

  // Power values
  'authority',
  'wealth',
  'dominance',
  'prestige',

  // Hedonism values
  'pleasure',
  'enjoyment',
  'gratification',

  // Stimulation values
  'excitement',
  'novelty',
  'challenge',

  // Self-direction values
  'freedom',
  'creativity',
  'independence',
  'curiosity',

  // Universalism values
  'equality',
  'justice',
  'tolerance',
  'wisdom',
] as const;

export type CoreValue = (typeof CORE_VALUES)[number];
```

### 4.2 Motivation Structure

```typescript
export interface Motivation {
  /** What they want */
  desire: string;
  /** Why they want it (underlying value) */
  underlyingValue: CoreValue;
  /** How strongly they want it (0-1) */
  intensity: number;
  /** Is this a surface or deep motivation? */
  depth: 'surface' | 'deep' | 'core';
  /** Can this be fulfilled in-game? */
  achievable: boolean;
}
```

### 4.3 Fear Structure

```typescript
export const FEAR_CATEGORIES = [
  'loss', // losing something/someone
  'failure', // not succeeding
  'rejection', // social exclusion
  'abandonment', // being left alone
  'exposure', // secrets revealed
  'helplessness', // loss of control
  'death', // mortality
  'unknown', // uncertainty
  'change', // losing stability
  'intimacy', // emotional vulnerability
] as const;

export type FearCategory = (typeof FEAR_CATEGORIES)[number];

export interface Fear {
  /** Category of fear */
  category: FearCategory;
  /** Specific manifestation */
  specific: string;
  /** How much it affects behavior (0-1) */
  intensity: number;
  /** What triggers this fear */
  triggers: string[];
  /** How they typically cope */
  copingMechanism: 'avoidance' | 'denial' | 'confrontation' | 'humor' | 'aggression';
}
```

## 5. Social & Relational Patterns

### 5.1 Attachment Style

```typescript
export const ATTACHMENT_STYLES = [
  'secure', // comfortable with intimacy and independence
  'anxious-preoccupied', // craves intimacy, fears rejection
  'dismissive-avoidant', // values independence, avoids intimacy
  'fearful-avoidant', // wants intimacy but fears it
] as const;

export type AttachmentStyle = (typeof ATTACHMENT_STYLES)[number];
```

### 5.2 Social Tendencies

```typescript
export interface SocialPattern {
  /** Default stance toward strangers */
  strangerDefault: 'welcoming' | 'neutral' | 'guarded' | 'hostile';
  /** How quickly they warm up to people */
  warmthRate: 'fast' | 'moderate' | 'slow' | 'very-slow';
  /** Preferred social role */
  preferredRole: 'leader' | 'supporter' | 'advisor' | 'loner' | 'entertainer' | 'caretaker';
  /** Conflict style */
  conflictStyle:
    | 'confrontational'
    | 'diplomatic'
    | 'avoidant'
    | 'passive-aggressive'
    | 'collaborative';
  /** How they handle criticism */
  criticismResponse: 'defensive' | 'reflective' | 'dismissive' | 'hurt' | 'grateful';
  /** Boundary setting */
  boundaries: 'rigid' | 'healthy' | 'porous' | 'nonexistent';
}
```

### 5.3 Relationship Modifiers

```typescript
export const RELATIONSHIP_LEVELS = [
  'stranger',
  'acquaintance',
  'colleague',
  'friend',
  'close-friend',
  'romantic',
  'family',
  'rival',
  'enemy',
] as const;

export type RelationshipLevel = (typeof RELATIONSHIP_LEVELS)[number];

// How personality expression changes based on relationship
export interface RelationshipModifier {
  level: RelationshipLevel;
  // Adjustments to baseline traits for this relationship level
  traitAdjustments: Partial<Record<PersonalityDimension, number>>; // -0.5 to +0.5
  // Behaviors unique to this relationship level
  unlockedBehaviors: string[];
  // Topics they'll discuss at this level
  conversationTopics: ('surface' | 'personal' | 'deep' | 'secrets')[];
}
```

## 6. Speech & Communication Style

### 6.1 Verbal Patterns

```typescript
export interface SpeechStyle {
  /** Vocabulary level */
  vocabulary: 'simple' | 'average' | 'educated' | 'erudite' | 'archaic';
  /** Sentence complexity */
  sentenceStructure: 'terse' | 'simple' | 'moderate' | 'complex' | 'elaborate';
  /** Formality default */
  formality: 'casual' | 'neutral' | 'formal' | 'ritualistic';
  /** Use of humor */
  humor: 'none' | 'rare' | 'occasional' | 'frequent' | 'constant';
  /** Humor type when used */
  humorType?: 'dry' | 'sarcastic' | 'witty' | 'slapstick' | 'dark' | 'self-deprecating';
  /** Emotional expressiveness in speech */
  expressiveness: 'stoic' | 'reserved' | 'moderate' | 'expressive' | 'dramatic';
  /** Directness */
  directness: 'blunt' | 'direct' | 'tactful' | 'indirect' | 'evasive';
  /** Pace of speech */
  pace: 'slow' | 'measured' | 'moderate' | 'quick' | 'rapid';
}
```

### 6.2 Verbal Tics & Patterns

```typescript
export interface VerbalQuirks {
  /** Catchphrases or recurring expressions */
  catchphrases: string[];
  /** Filler words they use */
  fillerWords: string[];
  /** How they address others */
  addressStyle: 'names' | 'titles' | 'nicknames' | 'terms-of-endearment' | 'formal-titles';
  /** Accent or dialect markers */
  dialectMarkers: string[];
  /** Words they avoid or never use */
  avoidedWords: string[];
  /** Profanity usage */
  profanity: 'never' | 'rare' | 'occasional' | 'frequent' | 'constant';
  /** Do they interrupt? */
  interrupts: boolean;
  /** Do they monologue? */
  monologueTendency: boolean;
}
```

### 6.3 Non-Verbal Communication

```typescript
export interface NonVerbalStyle {
  /** Eye contact comfort */
  eyeContact: 'avoidant' | 'occasional' | 'normal' | 'intense';
  /** Physical touch comfort */
  touchComfort: 'averse' | 'reserved' | 'normal' | 'touchy';
  /** Personal space needs */
  personalSpace: 'large' | 'normal' | 'small';
  /** Facial expressiveness */
  facialExpressiveness: 'blank' | 'subtle' | 'normal' | 'animated';
  /** Gesture usage */
  gestures: 'minimal' | 'moderate' | 'expressive' | 'theatrical';
  /** Posture tendency */
  posture: 'closed' | 'neutral' | 'open' | 'dominant';
  /** Nervous habits */
  nervousHabits: string[];
}
```

## 7. Behavioral Patterns & Tendencies

### 7.1 Decision-Making Style

```typescript
export interface DecisionStyle {
  /** Primary decision driver */
  driver: 'logic' | 'emotion' | 'intuition' | 'values' | 'pragmatism';
  /** Speed of decisions */
  speed: 'impulsive' | 'quick' | 'deliberate' | 'slow' | 'paralyzed';
  /** Risk tolerance */
  riskTolerance: 'averse' | 'cautious' | 'moderate' | 'tolerant' | 'seeking';
  /** How they handle uncertainty */
  uncertaintyResponse: 'anxious' | 'cautious' | 'comfortable' | 'excited';
  /** Do they seek others' input? */
  consultative: boolean;
  /** Do they change their mind? */
  flexibility: 'rigid' | 'reluctant' | 'moderate' | 'flexible' | 'indecisive';
}
```

### 7.2 Stress Response

```typescript
export const STRESS_RESPONSES = [
  'fight', // becomes aggressive/confrontational
  'flight', // withdraws/escapes
  'freeze', // becomes paralyzed/indecisive
  'fawn', // becomes people-pleasing
] as const;

export type StressResponse = (typeof STRESS_RESPONSES)[number];

export interface StressBehavior {
  /** Primary stress response */
  primary: StressResponse;
  /** Secondary stress response */
  secondary?: StressResponse;
  /** Stress threshold (0-1, low = easily stressed) */
  threshold: number;
  /** Recovery rate */
  recoveryRate: 'slow' | 'moderate' | 'fast';
  /** What helps them calm down */
  soothingActivities: string[];
  /** Red flags that they're stressed */
  stressIndicators: string[];
}
```

### 7.3 Habits & Routines

```typescript
export interface HabitPattern {
  /** Morning routine importance */
  routineOriented: boolean;
  /** Comfort objects/activities */
  comfortBehaviors: string[];
  /** Vices or bad habits */
  vices: string[];
  /** Compulsive behaviors */
  compulsions: string[];
  /** How they relax */
  relaxationMethods: string[];
  /** Procrastination tendency */
  procrastinates: boolean;
}
```

## 8. Cognitive Patterns

### 8.1 Thinking Style

```typescript
export interface CognitiveStyle {
  /** Big picture vs. detail oriented */
  focus: 'big-picture' | 'balanced' | 'detail-oriented';
  /** Linear vs. non-linear thinking */
  processing: 'linear' | 'mixed' | 'non-linear';
  /** Optimism/pessimism bias */
  outlook: 'pessimistic' | 'realistic' | 'optimistic' | 'naive';
  /** Internal vs. external locus of control */
  locusOfControl: 'internal' | 'mixed' | 'external';
  /** Self-awareness level */
  selfAwareness: 'low' | 'moderate' | 'high';
  /** How they process emotions */
  emotionalProcessing: 'suppressive' | 'ruminative' | 'expressive' | 'analytical';
}
```

### 8.2 Biases & Blind Spots

```typescript
export interface CognitiveBias {
  /** Name of the bias */
  name: string;
  /** How it manifests */
  manifestation: string;
  /** Situations where it appears */
  triggers: string[];
  /** Intensity (0-1) */
  intensity: number;
}
```

## 9. Growth & Change

### 9.1 Character Arc Potential

```typescript
export interface GrowthPotential {
  /** What they could learn */
  lessonsToLearn: string[];
  /** Traits that could develop positively */
  positiveGrowthAreas: Partial<Record<PersonalityDimension, string>>;
  /** Traits that could develop negatively under pressure */
  negativeGrowthAreas: Partial<Record<PersonalityDimension, string>>;
  /** What would trigger positive growth */
  growthCatalysts: string[];
  /** What would trigger negative growth */
  regressionCatalysts: string[];
}
```

## 10. Complete Schema Structure

```typescript
export const PersonalityMapSchema = z.object({
  // Core trait dimensions
  dimensions: z
    .object({
      openness: z.number().min(0).max(1).default(0.5),
      conscientiousness: z.number().min(0).max(1).default(0.5),
      extraversion: z.number().min(0).max(1).default(0.5),
      agreeableness: z.number().min(0).max(1).default(0.5),
      neuroticism: z.number().min(0).max(1).default(0.5),
    })
    .partial(),

  // Granular facets (optional, for deeper characterization)
  facets: z.record(z.string(), z.number().min(0).max(1)).optional(),

  // Simple trait keywords (for backwards compatibility)
  traits: z.array(z.string().min(1).max(50)).max(12).optional(),

  // Emotional baseline
  emotionalBaseline: EmotionalStateSchema.optional(),

  // Values and motivations
  values: z.array(ValueSchema).max(5).optional(),
  motivations: z.array(MotivationSchema).max(6).optional(),
  fears: z.array(FearSchema).max(4).optional(),

  // Social patterns
  attachment: z.enum(ATTACHMENT_STYLES).optional(),
  social: SocialPatternSchema.optional(),

  // Communication style
  speech: SpeechStyleSchema.optional(),
  verbalQuirks: VerbalQuirksSchema.optional(),
  nonVerbal: NonVerbalStyleSchema.optional(),

  // Behavioral tendencies
  decisions: DecisionStyleSchema.optional(),
  stress: StressBehaviorSchema.optional(),
  habits: HabitPatternSchema.optional(),

  // Cognitive patterns
  cognitive: CognitiveStyleSchema.optional(),
  biases: z.array(CognitiveBiasSchema).max(5).optional(),

  // Growth potential
  growth: GrowthPotentialSchema.optional(),
});

export type PersonalityMap = z.infer<typeof PersonalityMapSchema>;
```

## 11. Helper Functions (Schema-Only)

Following the body.ts pattern, we include pure schema-related helpers:

```typescript
/**
 * Resolve a trait keyword to its personality dimension.
 */
export function resolveTraitToDimension(
  trait: string
): { dimension: PersonalityDimension; facet?: string } | undefined;

/**
 * Check if a string is a valid trait reference.
 */
export function isTraitReference(value: string): boolean;

/**
 * Get default trait description for a dimension at a given level.
 */
export function getTraitDescription(dimension: PersonalityDimension, level: number): string;

/**
 * Get the opposite trait for a given trait (for spectrum representation).
 */
export function getTraitOpposite(trait: string): string | undefined;
```

## 12. Integration Points

### 12.1 With CharacterProfile

The personality schema integrates with `CharacterProfileSchema`:

```typescript
// In characterProfile.ts
export const CharacterProfileSchema = CharacterBasicsSchema.extend({
  // Existing simple personality field (backwards compatible)
  personality: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),

  // NEW: Rich personality map for deeper characterization
  personalityMap: PersonalityMapSchema.optional(),

  // ... other fields
});
```

### 12.2 With NPC Agent

The NPC agent can query personality data for:

- Dialogue style generation
- Emotional response calculation
- Relationship-appropriate behavior
- Stress-response triggering

### 12.3 With Governor/Context Builder

The context builder can extract relevant personality facets based on intent:

- `talk` intent → speech style, social patterns
- `examine` intent → nervousness indicators, non-verbal cues
- Stress-inducing situations → stress response patterns

## 13. Example Usage

```typescript
const elena: PersonalityMap = {
  dimensions: {
    openness: 0.7, // curious, imaginative
    conscientiousness: 0.8, // organized, reliable
    extraversion: 0.3, // reserved, introspective
    agreeableness: 0.6, // kind but has boundaries
    neuroticism: 0.4, // somewhat anxious
  },

  traits: ['reserved', 'thoughtful', 'loyal', 'perfectionist'],

  emotionalBaseline: {
    current: 'anticipation',
    intensity: 'mild',
    moodBaseline: 'trust',
    moodStability: 0.7,
  },

  values: [
    { name: 'knowledge', priority: 1 },
    { name: 'loyalty', priority: 2 },
    { name: 'independence', priority: 3 },
  ],

  fears: [
    {
      category: 'failure',
      specific: 'failing to protect those she cares about',
      intensity: 0.8,
      triggers: ['danger to friends', 'being unprepared'],
      copingMechanism: 'avoidance',
    },
  ],

  attachment: 'secure',

  social: {
    strangerDefault: 'guarded',
    warmthRate: 'slow',
    preferredRole: 'advisor',
    conflictStyle: 'diplomatic',
    criticismResponse: 'reflective',
    boundaries: 'healthy',
  },

  speech: {
    vocabulary: 'educated',
    sentenceStructure: 'moderate',
    formality: 'neutral',
    humor: 'occasional',
    humorType: 'dry',
    expressiveness: 'reserved',
    directness: 'tactful',
    pace: 'measured',
  },

  stress: {
    primary: 'freeze',
    secondary: 'fawn',
    threshold: 0.6,
    recoveryRate: 'moderate',
    soothingActivities: ['reading', 'solitude', 'tea'],
    stressIndicators: ['becomes quieter', 'fidgets with hands'],
  },
};
```

## 14. Prompt Injection System

### 14.1 Design Principles

Each trait should map to a **micro-prompt** that:

- Is **atomic**: 10-25 words, single behavioral directive
- Is **composable**: Can combine with other trait prompts without contradiction
- Is **behavioral**: Focuses on observable actions, not internal states
- Is **LLM-friendly**: Uses clear, directive language the model can follow

### 14.2 Trait Prompt Registry

```typescript
/**
 * Maps trait identifiers to their prompt injection fragments.
 * These are combined at runtime based on the character's personality map.
 */
export const TRAIT_PROMPTS: Record<string, TraitPrompt> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRAVERSION FACETS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Activity/Energy spectrum
  'activity:high': {
    prompt: 'Speak and move with energy. Show enthusiasm. Dislike inactivity.',
    category: 'demeanor',
    conflicts: ['activity:low', 'lethargic', 'languid'],
  },
  'activity:low': {
    prompt: 'Move and speak at a measured pace. Conserve energy. Appear calm or unhurried.',
    category: 'demeanor',
    conflicts: ['activity:high', 'hyperactive', 'restless'],
  },

  // Cheerfulness spectrum
  'cheerfulness:high': {
    prompt: 'Express positive emotions readily. Smile often. Look for bright sides.',
    category: 'emotional',
    conflicts: ['cheerfulness:low', 'gloomy', 'pessimistic'],
  },
  'cheerfulness:low': {
    prompt: 'Maintain neutral or subdued affect. Rarely express overt happiness.',
    category: 'emotional',
    conflicts: ['cheerfulness:high', 'bubbly', 'effervescent'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AGREEABLENESS FACETS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Cooperation spectrum
  'cooperation:high': {
    prompt: "Seek compromise. Avoid conflict. Accommodate others' preferences.",
    category: 'social',
    conflicts: ['cooperation:low', 'combative', 'contrary'],
  },
  'cooperation:low': {
    prompt: 'Stand firm on positions. Resist pressure to conform. Challenge disagreements.',
    category: 'social',
    conflicts: ['cooperation:high', 'pushover', 'doormat'],
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

  // Sympathy spectrum
  'sympathy:high': {
    prompt:
      "React to others' emotions with concern. Offer comfort. Show you understand their feelings.",
    category: 'emotional',
    conflicts: ['sympathy:low', 'callous', 'indifferent'],
  },
  'sympathy:low': {
    prompt: "Respond to emotions with logic or practicality. Do not mirror others' distress.",
    category: 'emotional',
    conflicts: ['sympathy:high', 'bleeding-heart'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSCIENTIOUSNESS FACETS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Dutifulness spectrum
  'dutifulness:high': {
    prompt: 'Honor commitments. Feel obligated to follow rules. Take responsibilities seriously.',
    category: 'behavioral',
    conflicts: ['dutifulness:low', 'unreliable', 'flaky'],
  },
  'dutifulness:low': {
    prompt: 'Treat rules as guidelines. Prioritize personal judgment over obligations.',
    category: 'behavioral',
    conflicts: ['dutifulness:high', 'rigid-rule-follower'],
  },

  // Self-discipline spectrum
  'self-discipline:high': {
    prompt: 'Stay focused on tasks. Resist distractions. Show willpower and persistence.',
    category: 'behavioral',
    conflicts: ['self-discipline:low', 'undisciplined', 'scattered'],
  },
  'self-discipline:low': {
    prompt: 'Follow impulses. Get easily sidetracked. Struggle with long-term focus.',
    category: 'behavioral',
    conflicts: ['self-discipline:high', 'obsessive'],
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NEUROTICISM FACETS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Anger spectrum
  'anger:high': {
    prompt: 'Show irritation readily. React sharply to frustration. Have a short fuse.',
    category: 'emotional',
    conflicts: ['anger:low', 'patient', 'unflappable'],
  },
  'anger:low': {
    prompt: 'Stay patient under provocation. Rarely show irritation. Let things slide.',
    category: 'emotional',
    conflicts: ['anger:high', 'hot-headed', 'volatile'],
  },

  // Vulnerability spectrum
  'vulnerability:high': {
    prompt: 'Show when overwhelmed. Admit when struggling. Seek support under stress.',
    category: 'emotional',
    conflicts: ['vulnerability:low', 'unshakeable', 'stoic'],
  },
  'vulnerability:low': {
    prompt: "Handle stress internally. Maintain composure. Don't show weakness.",
    category: 'emotional',
    conflicts: ['vulnerability:high', 'fragile', 'delicate'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENNESS FACETS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Intellect spectrum
  'intellect:high': {
    prompt: 'Show curiosity about ideas. Ask probing questions. Enjoy complex topics.',
    category: 'cognitive',
    conflicts: ['intellect:low', 'incurious', 'simple-minded'],
  },
  'intellect:low': {
    prompt: 'Prefer practical over theoretical. Avoid abstract discussions. Keep things simple.',
    category: 'cognitive',
    conflicts: ['intellect:high', 'pretentious', 'intellectual'],
  },

  // Adventurousness spectrum
  'adventurousness:high': {
    prompt: 'Embrace new experiences. Suggest trying something different. Dislike routine.',
    category: 'behavioral',
    conflicts: ['adventurousness:low', 'cautious', 'stick-in-mud'],
  },
  'adventurousness:low': {
    prompt: 'Prefer familiar options. Resist change. Find comfort in routine.',
    category: 'behavioral',
    conflicts: ['adventurousness:high', 'thrill-seeker'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEECH STYLE PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // HUMOR PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

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
  'humor:self-deprecating': {
    prompt: 'Make yourself the butt of jokes. Downplay your abilities humorously.',
    category: 'speech',
    conflicts: ['humor:none', 'modesty:low'],
  },
  'humor:none': {
    prompt: 'Take things seriously. Do not make jokes or use humor to deflect.',
    category: 'speech',
    conflicts: ['humor:constant', 'humor:frequent'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STRESS RESPONSE PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACHMENT STYLE PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

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

export interface TraitPrompt {
  /** The prompt fragment to inject (10-25 words ideal) */
  prompt: string;
  /** Category for grouping and potential limits */
  category:
    | 'social'
    | 'communication'
    | 'emotional'
    | 'behavioral'
    | 'cognitive'
    | 'speech'
    | 'decision'
    | 'stress'
    | 'relational';
  /** Trait IDs that cannot coexist with this trait */
  conflicts: string[];
  /** Optional: relationship levels where this trait is suppressed */
  suppressedAt?: RelationshipLevel[];
  /** Optional: relationship levels where this trait is amplified */
  amplifiedAt?: RelationshipLevel[];
}
```

### 14.3 Prompt Assembly Strategy

```typescript
/**
 * Assembles personality prompts for a character based on their personality map.
 * Returns a compact prompt block suitable for system prompt injection.
 *
 * Design constraints:
 * - Maximum ~150 words total personality prompt
 * - Prioritize high-intensity traits
 * - Validate no conflicting traits
 * - Group by category for readability
 */
export function assemblePersonalityPrompt(
  personality: PersonalityMap,
  relationshipLevel: RelationshipLevel = 'stranger',
  maxTraits: number = 8
): string;

/**
 * Validates that selected traits don't conflict.
 * Returns array of conflict pairs if any exist.
 */
export function validateTraitCompatibility(traitIds: string[]): Array<[string, string]>;

/**
 * Gets all traits that conflict with a given trait.
 */
export function getConflictingTraits(traitId: string): string[];
```

### 14.4 Example Assembled Prompts

**Reserved Scholar (Elena)**:

```text
PERSONALITY:
- Prefer solitude or one-on-one interaction. Find crowds draining.
- Speak with care and precision. Use hedging language.
- Show curiosity about ideas. Ask probing questions.
- Keep greetings brief and functional. Do not volunteer personal warmth.
- Think before acting. Consider consequences.
- Deliver jokes with a straight face. Use understatement.
```

**Charismatic Rogue (Marcus)**:

```text
PERSONALITY:
- Greet others warmly. Show genuine interest in them.
- Speak confidently about accomplishments. Know your worth.
- Act on instinct. Decide quickly. Don't overthink.
- Use irony and mock sincerity for humor.
- Give others benefit of the doubt initially.
- Under pressure, become more confrontational. Stand ground.
```

**Anxious Healer (Lily)**:

```text
PERSONALITY:
- Offer help unprompted. Prioritize others' needs.
- Express worry about outcomes. Show nervous mannerisms.
- Seek compromise. Avoid conflict. Accommodate preferences.
- Under pressure, become accommodating. Prioritize harmony.
- React to others' emotions with concern. Show you understand.
- Downplay achievements. Deflect praise.
```

### 14.5 Category Budgets

To prevent prompt bloat, enforce per-category limits:

```typescript
export const CATEGORY_LIMITS: Record<TraitPrompt['category'], number> = {
  social: 2, // How they interact
  communication: 2, // How they express themselves
  emotional: 2, // How they feel/react
  behavioral: 2, // What they do
  cognitive: 1, // How they think
  speech: 2, // Speech patterns
  decision: 1, // How they decide
  stress: 1, // Under pressure
  relational: 1, // Attachment patterns
};
// Total max: 14 traits, but recommend 6-8 for optimal prompt size
```

## 15. Trait Conflict System

### 15.1 Conflict Types

```typescript
/**
 * Types of trait conflicts:
 *
 * 1. POLAR_OPPOSITE: Traits on opposite ends of same spectrum
 *    Example: 'friendliness:high' vs 'friendliness:low'
 *
 * 2. LOGICAL_CONTRADICTION: Traits that can't coexist logically
 *    Example: 'trust:high' + 'paranoid'
 *
 * 3. BEHAVIORAL_CLASH: Traits that produce incompatible behaviors
 *    Example: 'speech:terse' + 'monologue-tendency'
 *
 * 4. SOFT_CONFLICT: Traits that are unusual together but not impossible
 *    Example: 'introverted' + 'leader' (possible but rare)
 */
export type ConflictType = 'polar' | 'logical' | 'behavioral' | 'soft';

export interface TraitConflict {
  trait1: string;
  trait2: string;
  type: ConflictType;
  /** For soft conflicts, describe when they CAN coexist */
  exception?: string;
}
```

### 15.2 Conflict Registry

```typescript
/**
 * Comprehensive conflict rules between traits.
 * Used for validation and UI warnings.
 */
export const TRAIT_CONFLICTS: TraitConflict[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // POLAR OPPOSITES (Same dimension, opposite ends)
  // ═══════════════════════════════════════════════════════════════════════════

  // Extraversion poles
  { trait1: 'friendliness:high', trait2: 'friendliness:low', type: 'polar' },
  { trait1: 'gregariousness:high', trait2: 'gregariousness:low', type: 'polar' },
  { trait1: 'assertiveness:high', trait2: 'assertiveness:low', type: 'polar' },
  { trait1: 'activity:high', trait2: 'activity:low', type: 'polar' },
  { trait1: 'cheerfulness:high', trait2: 'cheerfulness:low', type: 'polar' },

  // Agreeableness poles
  { trait1: 'trust:high', trait2: 'trust:low', type: 'polar' },
  { trait1: 'altruism:high', trait2: 'altruism:low', type: 'polar' },
  { trait1: 'cooperation:high', trait2: 'cooperation:low', type: 'polar' },
  { trait1: 'modesty:high', trait2: 'modesty:low', type: 'polar' },
  { trait1: 'sympathy:high', trait2: 'sympathy:low', type: 'polar' },

  // Conscientiousness poles
  { trait1: 'orderliness:high', trait2: 'orderliness:low', type: 'polar' },
  { trait1: 'dutifulness:high', trait2: 'dutifulness:low', type: 'polar' },
  { trait1: 'self-discipline:high', trait2: 'self-discipline:low', type: 'polar' },
  { trait1: 'cautiousness:high', trait2: 'cautiousness:low', type: 'polar' },

  // Neuroticism poles
  { trait1: 'anxiety:high', trait2: 'anxiety:low', type: 'polar' },
  { trait1: 'anger:high', trait2: 'anger:low', type: 'polar' },
  { trait1: 'vulnerability:high', trait2: 'vulnerability:low', type: 'polar' },

  // Openness poles
  { trait1: 'imagination:high', trait2: 'imagination:low', type: 'polar' },
  { trait1: 'intellect:high', trait2: 'intellect:low', type: 'polar' },
  { trait1: 'adventurousness:high', trait2: 'adventurousness:low', type: 'polar' },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGICAL CONTRADICTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Trust conflicts
  { trait1: 'trust:high', trait2: 'paranoid', type: 'logical' },
  { trait1: 'trust:high', trait2: 'suspicious', type: 'logical' },
  { trait1: 'trust:low', trait2: 'naive', type: 'logical' },
  { trait1: 'trust:low', trait2: 'gullible', type: 'logical' },

  // Anxiety conflicts
  { trait1: 'anxiety:low', trait2: 'nervous', type: 'logical' },
  { trait1: 'anxiety:low', trait2: 'worried', type: 'logical' },
  { trait1: 'anxiety:high', trait2: 'carefree', type: 'logical' },
  { trait1: 'anxiety:high', trait2: 'relaxed', type: 'logical' },

  // Order conflicts
  { trait1: 'orderliness:high', trait2: 'chaotic', type: 'logical' },
  { trait1: 'orderliness:high', trait2: 'messy', type: 'logical' },
  { trait1: 'orderliness:high', trait2: 'disorganized', type: 'logical' },
  { trait1: 'orderliness:low', trait2: 'meticulous', type: 'logical' },
  { trait1: 'orderliness:low', trait2: 'perfectionist', type: 'logical' },

  // Modesty conflicts
  { trait1: 'modesty:high', trait2: 'boastful', type: 'logical' },
  { trait1: 'modesty:high', trait2: 'arrogant', type: 'logical' },
  { trait1: 'modesty:low', trait2: 'self-deprecating', type: 'logical' },

  // ═══════════════════════════════════════════════════════════════════════════
  // BEHAVIORAL CLASHES
  // ═══════════════════════════════════════════════════════════════════════════

  // Speech style conflicts
  { trait1: 'speech:terse', trait2: 'speech:elaborate', type: 'behavioral' },
  { trait1: 'speech:terse', trait2: 'speech:verbose', type: 'behavioral' },
  { trait1: 'speech:formal', trait2: 'speech:casual', type: 'behavioral' },
  { trait1: 'speech:formal', trait2: 'speech:crude', type: 'behavioral' },
  { trait1: 'speech:blunt', trait2: 'speech:evasive', type: 'behavioral' },
  { trait1: 'speech:blunt', trait2: 'speech:indirect', type: 'behavioral' },

  // Stress response conflicts (can only have one primary)
  { trait1: 'stress:fight', trait2: 'stress:flight', type: 'behavioral' },
  { trait1: 'stress:fight', trait2: 'stress:fawn', type: 'behavioral' },
  { trait1: 'stress:freeze', trait2: 'stress:fight', type: 'behavioral' },
  { trait1: 'stress:freeze', trait2: 'stress:fawn', type: 'behavioral' },

  // Attachment conflicts (can only have one)
  { trait1: 'attachment:secure', trait2: 'attachment:anxious', type: 'behavioral' },
  { trait1: 'attachment:secure', trait2: 'attachment:dismissive', type: 'behavioral' },
  { trait1: 'attachment:secure', trait2: 'attachment:fearful', type: 'behavioral' },
  { trait1: 'attachment:anxious', trait2: 'attachment:dismissive', type: 'behavioral' },

  // Humor conflicts
  { trait1: 'humor:none', trait2: 'humor:dry', type: 'behavioral' },
  { trait1: 'humor:none', trait2: 'humor:sarcastic', type: 'behavioral' },
  { trait1: 'humor:none', trait2: 'humor:dark', type: 'behavioral' },
  { trait1: 'humor:none', trait2: 'humor:self-deprecating', type: 'behavioral' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT CONFLICTS (Unusual but possible combinations)
  // ═══════════════════════════════════════════════════════════════════════════

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
  {
    trait1: 'trust:low',
    trait2: 'altruism:high',
    type: 'soft',
    exception: "Possible for those who help but don't expect reciprocation",
  },
  {
    trait1: 'assertiveness:high',
    trait2: 'cooperation:high',
    type: 'soft',
    exception: 'Possible for diplomatic leaders who assert while seeking consensus',
  },
  {
    trait1: 'humor:dark',
    trait2: 'sympathy:high',
    type: 'soft',
    exception: 'Possible for those who use dark humor as a coping mechanism for empathy fatigue',
  },
];
```

### 15.3 Conflict Validation Functions

```typescript
/**
 * Check if two traits conflict and return the conflict details.
 */
export function checkTraitConflict(trait1: string, trait2: string): TraitConflict | undefined {
  return TRAIT_CONFLICTS.find(
    (c) =>
      (c.trait1 === trait1 && c.trait2 === trait2) || (c.trait1 === trait2 && c.trait2 === trait1)
  );
}

/**
 * Validate a full trait set and return all conflicts.
 */
export function validateTraitSet(traits: string[]): {
  valid: boolean;
  hardConflicts: TraitConflict[]; // polar, logical, behavioral
  softConflicts: TraitConflict[]; // unusual but allowed
} {
  const hardConflicts: TraitConflict[] = [];
  const softConflicts: TraitConflict[] = [];

  for (let i = 0; i < traits.length; i++) {
    for (let j = i + 1; j < traits.length; j++) {
      const conflict = checkTraitConflict(traits[i], traits[j]);
      if (conflict) {
        if (conflict.type === 'soft') {
          softConflicts.push(conflict);
        } else {
          hardConflicts.push(conflict);
        }
      }
    }
  }

  return {
    valid: hardConflicts.length === 0,
    hardConflicts,
    softConflicts,
  };
}

/**
 * Get all traits that are compatible with a given trait.
 * Useful for UI to gray out incompatible options.
 */
export function getCompatibleTraits(selectedTrait: string, allTraits: string[]): string[] {
  const conflicting = new Set(
    TRAIT_CONFLICTS.filter((c) => c.trait1 === selectedTrait || c.trait2 === selectedTrait)
      .filter((c) => c.type !== 'soft')
      .map((c) => (c.trait1 === selectedTrait ? c.trait2 : c.trait1))
  );

  return allTraits.filter((t) => !conflicting.has(t));
}
```

### 15.4 UI Integration Considerations

```typescript
/**
 * When building a character creation UI:
 *
 * 1. When user selects a trait, gray out all hard-conflicting traits
 * 2. Show warning icon for soft conflicts with tooltip explaining exception
 * 3. Prevent saving if any hard conflicts exist
 * 4. Show assembled prompt preview so authors can see final result
 *
 * Example UI state:
 * - Selected: ['friendliness:high', 'trust:high', 'speech:formal']
 * - Grayed out: ['friendliness:low', 'trust:low', 'paranoid', 'speech:casual', ...]
 * - Warning: none
 */
```

## 16. Relationship-Aware Prompt Modulation

### 16.1 Trait Expression by Relationship Level

```typescript
/**
 * Some traits are expressed differently based on relationship level.
 * This modulates which prompts are active or amplified.
 */
export const RELATIONSHIP_MODULATION: Record<RelationshipLevel, TraitModulation> = {
  stranger: {
    suppress: ['vulnerability:high', 'attachment:anxious'],
    amplify: ['cautiousness:high', 'trust:low'],
    override: {
      // Even friendly people are more guarded with strangers
      'friendliness:high': 'Be polite but maintain appropriate distance with new people.',
    },
  },
  acquaintance: {
    suppress: [],
    amplify: [],
    override: {},
  },
  friend: {
    suppress: ['trust:low', 'speech:formal'],
    amplify: ['cheerfulness:high', 'humor:*'],
    override: {},
  },
  'close-friend': {
    suppress: ['modesty:high', 'speech:formal'],
    amplify: ['vulnerability:high', 'trust:high'],
    override: {
      // Even guarded people open up to close friends
      'trust:low': 'Trust this person despite general wariness of others.',
    },
  },
  romantic: {
    suppress: [],
    amplify: ['attachment:*', 'sympathy:high'],
    override: {},
  },
  enemy: {
    suppress: ['trust:high', 'altruism:high', 'cooperation:high'],
    amplify: ['trust:low', 'assertiveness:high'],
    override: {
      'friendliness:high': 'Maintain cold civility. Do not show warmth.',
    },
  },
};

interface TraitModulation {
  /** Traits to remove from prompt at this relationship level */
  suppress: string[];
  /** Traits to emphasize at this relationship level */
  amplify: string[];
  /** Replacement prompts for specific traits at this level */
  override: Record<string, string>;
}
```

## 17. Open Questions

1. **Validation Complexity**: Should we validate that facet values are consistent with their parent dimension?

2. **Mood Drift**: Should emotional state changes be tracked in the schema or purely in session state?

3. **Relationship Storage**: Should relationship modifiers live in personality or in a separate relationships schema?

4. **Schema Size**: At full specification, this schema could be large. Do we need tiered versions (basic/detailed/complete)?

5. **LLM Context Budget**: How much personality data can we include in prompts before it becomes counterproductive?

6. **Soft Conflict Handling**: Should soft conflicts show a warning or require explicit acknowledgment?

7. **Dynamic Traits**: Should some traits unlock/change based on gameplay events?

8. **Prompt Caching**: Should we cache assembled prompts per character+relationship combo?

## 18. Next Steps

1. Implement core schemas in `packages/schemas/src/character/personality.ts`
2. Update `CharacterProfileSchema` to include `personalityMap`
3. Update `serializeCharacter` in prompt.ts to leverage personality data
4. Add personality-aware prompting in NPC agent
5. Create example character files using the new schema
6. Document personality authoring guidelines in dev-docs
