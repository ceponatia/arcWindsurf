import { z } from 'zod'

// Single nested schema export: character personality (traits + optional style)
export const CharacterPersonalitySchema = z
.object({
  traits: z
  .union([
    z.string().min(1),
    z.array(z.string().min(1)).nonempty(),
  ]),
  speechStyle: z
  .object({
    sentenceLength: z.enum(['terse', 'balanced', 'long']),
    humor: z.enum(['none', 'light', 'wry', 'dark']),
    darkness: z.enum(['low', 'medium', 'high']),
    pacing: z.enum(['slow', 'balanced', 'fast']),
    formality: z.enum(['casual', 'neutral', 'formal']),
    verbosity: z.enum(['terse', 'balanced', 'lavish']),
  })
  .partial()
})