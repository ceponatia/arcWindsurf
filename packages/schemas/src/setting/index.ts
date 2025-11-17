import { z } from 'zod';
import { SettingBackgroundSchema, type SettingBackground } from './background';

// Re-export leaf schema/type
export * from './background';

// SettingProfile is an alias of SettingBackground for now
export const SettingProfileSchema = SettingBackgroundSchema;
export type SettingProfile = z.infer<typeof SettingProfileSchema>;
export type { SettingBackground };
