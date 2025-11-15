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