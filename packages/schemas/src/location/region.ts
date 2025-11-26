import { z } from 'zod';

export const RegionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  climate: z.enum(['temperate', 'tropical', 'arid', 'polar', 'continental', 'alien']),
  terrain: z.enum(['plains', 'forest', 'mountains', 'desert', 'swamp', 'coast', 'urban', 'mixed']),
  populationDensity: z.enum(['sparse', 'scattered', 'settled', 'dense', 'mega_city']),
  // Short flavor tags ("frontier", "war_torn", etc.)
  tags: z.array(z.string().min(1)).optional(),
});

export type Region = z.infer<typeof RegionSchema>;
