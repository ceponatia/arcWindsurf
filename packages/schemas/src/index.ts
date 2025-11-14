import { z } from 'zod'

// Reusable Appearance schema (machine-readable with optional free text)
export const AppearanceSchema = z.object({
  hair: z
    .object({
      color: z.string().min(1).optional(),
      style: z.string().min(1).optional(),
      length: z.string().min(1).optional(),
    })
    .partial()
    .optional(),
  eyes: z
    .object({
      color: z.string().min(1).optional(),
    })
    .partial()
    .optional(),
  height: z.enum(['short', 'average', 'tall']).optional(),
  build: z.enum(['slight', 'average', 'athletic', 'heavy']).optional(),
  skinTone: z.string().min(1).optional(),
  features: z.array(z.string().min(1)).optional(),
  description: z.string().min(1).optional(),
})

export type Appearance = z.infer<typeof AppearanceSchema>

// Optional scent descriptors for realism
export const ScentSchema = z.object({
  hairScent: z.enum(['floral', 'citrus', 'fresh', 'herbal', 'neutral']).optional(),
  bodyScent: z.enum(['clean', 'fresh', 'neutral', 'light musk']).optional(),
  perfume: z.string().min(1).max(40).optional(),
})

export type Scent = z.infer<typeof ScentSchema>

// CharacterProfile schema
export const CharacterProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  age: z.number().int().positive().max(120).optional(),
  summary: z.string().min(1),
  backstory: z.string().min(1),
  // Allow personality as either a single string or an array of strings for more granular traits
  personality: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  // Backward-compatible: allow either a free text string or structured object
  appearance: z.union([z.string().min(1), AppearanceSchema]).optional(),
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
  scent: ScentSchema.optional(),
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
