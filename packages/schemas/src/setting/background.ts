import { z } from 'zod';
import { TimeConfigSchema } from '../time/index.js';
import { InterestConfigSchema } from '../npc-tier/index.js';

export const SettingSafetySchema = z.object({
  rating: z.enum(['G', 'PG', 'PG-13', 'R', 'NC-17']).optional(),
  excludedTopics: z.array(z.string()).optional(),
  contentWarnings: z.array(z.string()).optional(),
});

export type SettingSafety = z.infer<typeof SettingSafetySchema>;

// Setting background schema
export const SettingBackgroundSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { error: 'Name is required' }).max(80),
  lore: z.string().min(1),
  themes: z.array(z.string().min(1)).optional(),
  /** User-defined tags for filtering and searching settings */
  tags: z.array(z.string().min(1)).optional(),

  /** Narrative tone instruction for the AI */
  tone: z.string().optional(),

  /** Safety and content boundaries */
  safety: SettingSafetySchema.optional(),

  /** Hard constraints for world logic */
  worldRules: z.array(z.string().min(1)).optional(),

  /** Default opening scene or hook */
  startingScenario: z.string().optional(),

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
