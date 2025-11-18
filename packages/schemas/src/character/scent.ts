import { z } from 'zod';

// Optional scent descriptors for realism
export const ScentSchema = z
  .object({
    hairScent: z.string().optional(),
    bodyScent: z.string().optional(),
    perfume: z.string().optional(),
  })
  .partial();

export type Scent = z.infer<typeof ScentSchema>;
