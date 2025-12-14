import { z } from 'zod';
import { TimeConfigSchema } from '../time/index.js';
import { InterestConfigSchema } from '../npc-tier/index.js';

// Setting background schema
export const SettingBackgroundSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { error: 'Name is required' }).max(80),
  lore: z.string().min(1),
  themes: z.array(z.string().min(1)).optional(),
  /** User-defined tags for filtering and searching settings */
  tags: z.array(z.string().min(1)).optional(),
  /**
   * Time configuration for this setting.
   * Allows custom calendars, day periods, and time scales.
   * If not provided, defaults are used.
   */
  timeConfig: TimeConfigSchema.optional(),
  /**
   * Interest scoring configuration for NPC promotion.
   * Controls how quickly NPCs are promoted based on player interaction.
   * If not provided, defaults are used.
   */
  interestConfig: InterestConfigSchema.optional(),
});

export type SettingBackground = z.infer<typeof SettingBackgroundSchema>;
/** User-defined tags array type */
export type SettingBackgroundTags = NonNullable<SettingBackground['tags']>;
