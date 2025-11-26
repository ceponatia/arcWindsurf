import { z } from 'zod';

export const BuildingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum([
    'residential',
    'commercial',
    'industrial',
    'civic',
    'religious',
    'military',
    'educational',
    'other',
  ]),
  condition: z.enum(['pristine', 'well_kept', 'worn', 'ruined']),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge']),
  // Short flavor tags ("haunted", "guarded", etc.)
  tags: z.array(z.string().min(1)).optional(),
});

export type Building = z.infer<typeof BuildingSchema>;
