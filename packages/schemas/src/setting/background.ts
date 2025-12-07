import { z } from 'zod';

// Setting background schema
export const SettingBackgroundSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { error: 'Name is required' }).max(80),
  lore: z.string().min(1),
  themes: z.array(z.string().min(1)).optional(),
  /** User-defined tags for filtering and searching settings */
  tags: z.array(z.string().min(1)).optional(),
});

export type SettingBackground = z.infer<typeof SettingBackgroundSchema>;
/** User-defined tags array type */
export type SettingBackgroundTags = NonNullable<SettingBackground['tags']>;
