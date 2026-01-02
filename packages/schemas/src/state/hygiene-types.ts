import { z } from 'zod';
import {
  RegionScentSchema,
  RegionTextureSchema,
  RegionFlavorSchema,
  RegionVisualSchema,
} from '../body-regions/sensory-types.js';
import type { HygieneLevel } from './hygiene.js';

/**
 * Defines how hygiene affects the visual appearance.
 * This is an augmentation, not a replacement.
 */
export const HygieneVisualModifierSchema = z.object({
  /** Text to append to the base description (e.g., "covered in grime") */
  descriptionAppend: z.string().optional(),
  /** Features to add to the list (e.g., "mud streaks", "greasy sheen") */
  featuresAdd: z.array(z.string()).optional(),
  /** Override the skin condition (e.g., "normal" -> "irritated") */
  skinConditionOverride: RegionVisualSchema.shape.skinCondition.optional(),
});

export type HygieneVisualModifier = z.infer<typeof HygieneVisualModifierSchema>;

/**
 * Container for all sensory modifiers at a specific hygiene level.
 */
export const HygieneSensoryModifiersSchema = z.object({
  scent: RegionScentSchema.partial().optional(),
  texture: RegionTextureSchema.partial().optional(),
  flavor: RegionFlavorSchema.partial().optional(),
  visual: HygieneVisualModifierSchema.optional(),
});

export type HygieneSensoryModifiers = z.infer<typeof HygieneSensoryModifiersSchema>;

/**
 * A full profile mapping hygiene levels (0-6) to sensory modifiers.
 */
export const HygieneProfileSchema = z.record(z.string(), HygieneSensoryModifiersSchema);

export type HygieneProfile = Record<HygieneLevel, HygieneSensoryModifiers>;

/**
 * Hierarchical hygiene data structure.
 */
export interface HygieneGroup {
  regions: string[];
  profile: HygieneProfile;
}

export interface HygieneDataConfig {
  default: HygieneProfile;
  groups?: Record<string, HygieneGroup>;
}

/**
 * Helper to flatten hierarchical hygiene data into a map of Region -> HygieneProfile.
 */
export function flattenHygieneData(
  config: HygieneDataConfig,
  allRegions: string[]
): Record<string, HygieneProfile> {
  const result: Record<string, HygieneProfile> = {};

  // 1. Apply default profile to all regions initially
  for (const region of allRegions) {
    result[region] = config.default;
  }

  // 2. Apply group overrides
  if (config.groups) {
    for (const group of Object.values(config.groups)) {
      for (const region of group.regions) {
        // Only apply if the region is in the allowed list (safety check)
        if (allRegions.includes(region)) {
          result[region] = group.profile;
        }
      }
    }
  }

  return result;
}
