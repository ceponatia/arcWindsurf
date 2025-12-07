import { z } from 'zod';
import {
  SettingBackgroundSchema,
  type SettingBackground,
  type SettingBackgroundTags,
} from './background.js';

// Re-export leaf schema/types
export * from './background.js';

// SettingProfile is an alias of SettingBackground for now
export const SettingProfileSchema = SettingBackgroundSchema;
export type SettingProfile = z.infer<typeof SettingProfileSchema>;
export type { SettingBackground, SettingBackgroundTags };
