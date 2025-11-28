import { z } from 'zod';

// Single sources of truth for speech style enums
export const SPEECH_SENTENCE_LENGTHS = ['terse', 'balanced', 'long'] as const;
export type SpeechSentenceLength = (typeof SPEECH_SENTENCE_LENGTHS)[number];

export const SPEECH_HUMOR_LEVELS = ['none', 'light', 'wry', 'dark'] as const;
export type SpeechHumorLevel = (typeof SPEECH_HUMOR_LEVELS)[number];

export const SPEECH_DARKNESS_LEVELS = ['low', 'medium', 'high'] as const;
export type SpeechDarknessLevel = (typeof SPEECH_DARKNESS_LEVELS)[number];

export const SPEECH_PACING_LEVELS = ['slow', 'balanced', 'fast'] as const;
export type SpeechPacingLevel = (typeof SPEECH_PACING_LEVELS)[number];

export const SPEECH_FORMALITY_LEVELS = ['casual', 'neutral', 'formal'] as const;
export type SpeechFormalityLevel = (typeof SPEECH_FORMALITY_LEVELS)[number];

export const SPEECH_VERBOSITY_LEVELS = ['terse', 'balanced', 'lavish'] as const;
export type SpeechVerbosityLevel = (typeof SPEECH_VERBOSITY_LEVELS)[number];

// Single nested schema export: character personality (traits + optional style)
export const CharacterPersonalitySchema = z.object({
  traits: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  speechStyle: z
    .object({
      sentenceLength: z.enum(SPEECH_SENTENCE_LENGTHS),
      humor: z.enum(SPEECH_HUMOR_LEVELS),
      darkness: z.enum(SPEECH_DARKNESS_LEVELS),
      pacing: z.enum(SPEECH_PACING_LEVELS),
      formality: z.enum(SPEECH_FORMALITY_LEVELS),
      verbosity: z.enum(SPEECH_VERBOSITY_LEVELS),
    })
    .partial(),
});

export type SpeechStyle = z.infer<typeof CharacterPersonalitySchema.shape.speechStyle>;
