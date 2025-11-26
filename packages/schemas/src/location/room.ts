import { z } from 'zod';

export const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  purpose: z.enum([
    'living',
    'sleeping',
    'storage',
    'work',
    'ritual',
    'throne',
    'prison',
    'utility',
    'other',
  ]),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'vast']),
  lighting: z.enum(['bright', 'dim', 'dark', 'flickering']),
  // Short flavor tags ("dusty", "bloodstained", etc.)
  tags: z.array(z.string().min(1)).optional(),
});

export type Room = z.infer<typeof RoomSchema>;
