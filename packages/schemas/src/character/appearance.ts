import { z } from 'zod';

// Reusable Appearance schema (machine-readable with optional free text)
export const AppearanceSchema = z.object({
  hair: z.object({
    color: z.string().min(1).default('brown'),
    style: z.string().min(1).default('straight'),
    length: z.string().min(1).default('medium'),
  }),
  eyes: z.object({
    color: z.string().min(1).default('brown'),
  }),
  height: z.enum(['short', 'average', 'tall']).default('average'),
  torso: z.enum(['slight', 'average', 'athletic', 'heavy']).default('average'),
  skinTone: z.string().min(1).default('pale'),
  features: z.array(z.string().min(1)).optional(),
  arms: z.object({
    build: z.enum(['average', 'muscular', 'slender']).default('average'),
    length: z.enum(['average', 'long', 'short']).default('average'),
  }),
  legs: z.object({
    length: z.enum(['average', 'long', 'short']).default('average'),
    build: z.enum(['very skinny', 'slender', 'average', 'toned', 'muscular']).default('toned'),
  }),
});

export type Appearance = z.infer<typeof AppearanceSchema>;
