import { z } from 'zod';

// Free-form detail entries that can seed future knowledge nodes
export const CHARACTER_DETAIL_AREAS = [
  'appearance',
  'body',
  'personality',
  'history',
  'ability',
  'preference',
  'relationship',
  'custom',
] as const;
export type CharacterDetailArea = (typeof CHARACTER_DETAIL_AREAS)[number];

export const CharacterDetailSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(400),
  area: z.enum(CHARACTER_DETAIL_AREAS).default('custom'),
  importance: z.number().min(0).max(1).default(0.5),
  tags: z.array(z.string().min(1)).default([]),
  notes: z.string().min(1).max(400).optional(),
});

export type CharacterDetail = z.infer<typeof CharacterDetailSchema>;
