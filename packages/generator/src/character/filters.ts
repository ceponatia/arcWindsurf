/**
 * Gender-based filtering for body and appearance regions.
 */

import {
  BODY_REGIONS,
  APPEARANCE_REGIONS,
  type Gender,
  type BodyRegion,
  type AppearanceRegion,
} from '@minimal-rpg/schemas';
import type { GenderRegionConfig, GenderAppearanceRegionConfig } from './types.js';

// ============================================================================
// Gender Region Configuration
// ============================================================================

/**
 * Body regions that are gender-specific.
 */
export const GENDER_BODY_REGIONS: GenderRegionConfig = {
  femaleOnly: ['breasts', 'nipples', 'vagina'] as const,
  maleOnly: ['penis'] as const,
};

/**
 * Appearance regions that are gender-specific.
 */
export const GENDER_APPEARANCE_REGIONS: GenderAppearanceRegionConfig = {
  femaleOnly: ['breasts', 'nipples', 'vagina'] as const,
  maleOnly: ['penis'] as const,
};

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * Get available body regions for a given gender.
 *
 * @param gender - The character's gender
 * @returns Array of body regions appropriate for the gender
 */
export function getBodyRegionsForGender(gender: Gender | undefined): BodyRegion[] {
  const normalized = gender?.toLowerCase().trim();

  // Base regions (excluding all gender-specific ones)
  const baseRegions = BODY_REGIONS.filter(
    (r) =>
      !GENDER_BODY_REGIONS.femaleOnly.includes(r as BodyRegion) &&
      !GENDER_BODY_REGIONS.maleOnly.includes(r as BodyRegion)
  );

  if (!normalized) {
    // No gender specified - return only neutral regions
    return [...baseRegions];
  }

  // Female: add female-only regions
  if (normalized === 'female') {
    return [...baseRegions, ...GENDER_BODY_REGIONS.femaleOnly];
  }

  // Male: add male-only regions
  if (normalized === 'male') {
    return [...baseRegions, ...GENDER_BODY_REGIONS.maleOnly];
  }

  // Other/unknown: return all regions
  return [...BODY_REGIONS];
}

/**
 * Get available appearance regions for a given gender.
 *
 * @param gender - The character's gender
 * @returns Array of appearance regions appropriate for the gender
 */
export function getAppearanceRegionsForGender(gender: Gender | undefined): AppearanceRegion[] {
  const normalized = gender?.toLowerCase().trim();

  // Base regions (excluding all gender-specific ones)
  const baseRegions = APPEARANCE_REGIONS.filter(
    (r) =>
      !GENDER_APPEARANCE_REGIONS.femaleOnly.includes(r as AppearanceRegion) &&
      !GENDER_APPEARANCE_REGIONS.maleOnly.includes(r as AppearanceRegion)
  );

  if (!normalized) {
    // No gender specified - return only neutral regions
    return [...baseRegions];
  }

  // Female: add female-only regions
  if (normalized === 'female') {
    return [...baseRegions, ...GENDER_APPEARANCE_REGIONS.femaleOnly];
  }

  // Male: add male-only regions
  if (normalized === 'male') {
    return [...baseRegions, ...GENDER_APPEARANCE_REGIONS.maleOnly];
  }

  // Other/unknown: return all regions
  return [...APPEARANCE_REGIONS];
}

/**
 * Check if a body region is appropriate for a given gender.
 */
export function isRegionForGender(region: BodyRegion, gender: Gender | undefined): boolean {
  const availableRegions = getBodyRegionsForGender(gender);
  return availableRegions.includes(region);
}

/**
 * Check if an appearance region is appropriate for a given gender.
 */
export function isAppearanceRegionForGender(
  region: AppearanceRegion,
  gender: Gender | undefined
): boolean {
  const availableRegions = getAppearanceRegionsForGender(gender);
  return availableRegions.includes(region);
}

/**
 * Filter out regions that don't match the gender.
 * Returns info about what was filtered.
 */
export function filterRegionsByGender(
  regions: BodyRegion[],
  gender: Gender | undefined
): {
  included: BodyRegion[];
  excluded: BodyRegion[];
} {
  const available = getBodyRegionsForGender(gender);
  const included: BodyRegion[] = [];
  const excluded: BodyRegion[] = [];

  for (const region of regions) {
    if (available.includes(region)) {
      included.push(region);
    } else {
      excluded.push(region);
    }
  }

  return { included, excluded };
}
