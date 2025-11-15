import { z } from 'zod'

// Character basics schema
export const CharacterBasicsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  age: z.number().int().positive().max(120).optional(),
  summary: z.string().min(1),
  backstory: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
})

export type CharacterBasics = z.infer<typeof CharacterBasicsSchema>