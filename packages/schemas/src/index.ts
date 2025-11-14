import { z } from 'zod'

// CharacterProfile schema
export const CharacterProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  summary: z.string().min(1),
  backstory: z.string().min(1),
  personality: z.string().min(1),
  appearance: z.string().min(1).optional(),
  goals: z.array(z.string().min(1)),
  speakingStyle: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  style: z
    .object({
      sentenceLength: z.enum(['terse', 'balanced', 'long']).optional(),
      humor: z.enum(['none', 'light', 'wry', 'dark']).optional(),
      darkness: z.enum(['low', 'medium', 'high']).optional(),
      pacing: z.enum(['slow', 'balanced', 'fast']).optional(),
      formality: z.enum(['casual', 'neutral', 'formal']).optional(),
      verbosity: z.enum(['terse', 'balanced', 'lavish']).optional(),
    })
    .optional(),
})

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>

// SettingProfile schema
export const SettingProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  lore: z.string().min(1),
  tone: z.string().min(1),
  constraints: z.array(z.string().min(1)).optional(),
})

export type SettingProfile = z.infer<typeof SettingProfileSchema>

export default { CharacterProfileSchema, SettingProfileSchema }
