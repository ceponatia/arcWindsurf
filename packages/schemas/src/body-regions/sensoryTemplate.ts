import { z } from 'zod';
import { BodyRegionDataSchema } from './sensory-types.js';

export const SensoryTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  suggestedFor: z
    .object({
      races: z.array(z.string()).optional(),
      occupations: z.array(z.string()).optional(),
      alignments: z.array(z.string()).optional(),
    })
    .optional(),
  affectedRegions: z.array(z.string()),
  fragments: z.record(z.string(), BodyRegionDataSchema.partial()),
});

export type SensoryTemplate = z.infer<typeof SensoryTemplateSchema>;
