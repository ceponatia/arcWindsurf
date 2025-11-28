import { z } from 'zod';

// Single source of truth for setting tags
export const SETTING_TAGS = ['romance', 'adventure', 'mystery', 'foot fetish', 'dirty'] as const;
export type SettingTag = (typeof SETTING_TAGS)[number];

// Setting background schema
export const SettingBackgroundSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { error: 'Name is required' }).max(80),
  lore: z.string().min(1),
  themes: z.array(z.string().min(1)).optional(),
  tags: z.array(z.enum(SETTING_TAGS)).optional(),
});

export type SettingBackground = z.infer<typeof SettingBackgroundSchema>;
export type SettingBackgroundTags = NonNullable<SettingBackground['tags']>;
