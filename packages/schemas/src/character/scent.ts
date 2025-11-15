import { z } from 'zod'

// Optional scent descriptors for realism
export const ScentSchema = z
.object({
  hairScent: z.enum(['floral', 'citrus', 'fresh', 'herbal', 'neutral']).optional(),
  bodyScent: z.enum(['clean', 'fresh', 'neutral', 'light musk']).optional(),
  perfume: z.string().min(1).max(40).optional(),
})
.partial()

export type Scent = z.infer<typeof ScentSchema>