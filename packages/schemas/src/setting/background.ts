import { z } from 'zod';

// Setting background schema
export const SettingBackgroundSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).max(80),
  lore: z.string().min(1),
  tone: z.string().min(1),
  constraints: z.array(z.string().min(1)).optional(),
});

export type SettingBackground = z.infer<typeof SettingBackgroundSchema>;
