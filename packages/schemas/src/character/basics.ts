import { z } from 'zod';

// Character basics schema
export const CharacterBasicsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { error: 'Name is required' }).max(120),
  age: z.number().int().positive().max(120).default(21),
  summary: z.string().min(1),
  backstory: z.string().min(1),
  tags: z.array(z.string().min(1)).default(['draft']),
});

export type CharacterBasics = z.infer<typeof CharacterBasicsSchema>;
