import { setRecord, getRecord, getRecordOptional } from '../shared/record-helpers.js';
import { BODY_REGIONS } from './regions.js';
import { HEAD_APPEARANCE } from '../body-regions/head/appearance.js';
import { NECK_APPEARANCE } from '../body-regions/neck/appearance.js';
import { UPPER_BODY_APPEARANCE } from '../body-regions/upper-body/appearance.js';
import { TORSO_APPEARANCE } from '../body-regions/torso/appearance.js';
import { ARMS_APPEARANCE } from '../body-regions/arms/appearance.js';
import { GROIN_APPEARANCE } from '../body-regions/groin/appearance.js';
import { LEGS_APPEARANCE } from '../body-regions/legs/appearance.js';
import { FEET_APPEARANCE } from '../body-regions/feet/appearance.js';
import type { AppearanceAttributeDef } from '../body-regions/types.js';

/**
 * Import shared physique schemas and types.
 *
 * Core physique schemas (BuildSchema, AppearanceSchema, PhysiqueSchema) and
 * all appearance enums are defined in:
 * @see ../shared/physique.ts
 */
import {
  APPEARANCE_HEIGHTS,
  APPEARANCE_TORSOS,
  APPEARANCE_ARMS_BUILD,
  APPEARANCE_ARMS_LENGTH,
  APPEARANCE_LEGS_LENGTH,
  APPEARANCE_FEET_SIZES,
  APPEARANCE_LEGS_BUILD,
  BuildSchema,
  AppearanceSchema,
  PhysiqueSchema,
  type AppearanceHeight,
  type AppearanceTorso,
  type AppearanceArmsBuild,
  type AppearanceArmsLength,
  type AppearanceLegsLength,
  type AppearanceFeetSize,
  type AppearanceLegsBuild,
  type Build,
  type Appearance,
  type Physique,
} from '../shared/physique.js';

// Re-export for backwards compatibility
export {
  APPEARANCE_HEIGHTS,
  APPEARANCE_TORSOS,
  APPEARANCE_ARMS_BUILD,
  APPEARANCE_ARMS_LENGTH,
  APPEARANCE_LEGS_LENGTH,
  APPEARANCE_FEET_SIZES,
  APPEARANCE_LEGS_BUILD,
  BuildSchema,
  AppearanceSchema,
  PhysiqueSchema,
  type AppearanceHeight,
  type AppearanceTorso,
  type AppearanceArmsBuild,
  type AppearanceArmsLength,
  type AppearanceLegsLength,
  type AppearanceFeetSize,
  type AppearanceLegsBuild,
  type Build,
  type Appearance,
  type Physique,
};

/**
 * Appearance Region Taxonomy
 * Defines appearance regions and their attributes for character building.
 * Uses canonical BODY_REGIONS from regions.ts plus 'overall' for general build.
 */

/**
 * Appearance regions - includes all BODY_REGIONS plus 'overall', 'eyes', and 'skin'.
 * These are the regions shown in the character builder's appearance section.
 *
 * Note: 'eyes' and 'skin' are appearance-specific regions not in BODY_REGIONS
 * because eyes are typically part of 'face' for sensory purposes and skin is
 * a general property rather than a specific body region.
 */
export const APPEARANCE_REGIONS = ['overall', 'eyes', 'skin', ...BODY_REGIONS] as const;

export type AppearanceRegion = (typeof APPEARANCE_REGIONS)[number];

/**
 * Region Attributes Configuration
 * Defines what attributes are available for each appearance region.
 * Used by the character builder to dynamically render attribute dropdowns.
 */

export type { AppearanceAttributeDef };

const DEFAULT_REGION_ATTRIBUTES: Record<string, AppearanceAttributeDef> = {
  description: { label: 'Description', placeholder: 'e.g., distinctive' },
};

/**
 * Build a complete attributes table for all appearance regions.
 *
 * The UI expects every region to have an attribute map; missing entries cause runtime errors.
 */
function buildAppearanceRegionAttributes(): Record<
  AppearanceRegion,
  Record<string, AppearanceAttributeDef>
> {
  const out = {} as Record<AppearanceRegion, Record<string, AppearanceAttributeDef>>;

  for (const region of APPEARANCE_REGIONS) {
    setRecord(out, region, DEFAULT_REGION_ATTRIBUTES);
  }

  // General build
  out.overall = {
    height: { label: 'Height', values: APPEARANCE_HEIGHTS },
    build: { label: 'Build', values: APPEARANCE_TORSOS },
  };

  // Appearance-specific regions (not in BODY_REGIONS)
  out.eyes = getRecordOptional(HEAD_APPEARANCE, 'eyes') ?? DEFAULT_REGION_ATTRIBUTES;
  out.skin = {
    tone: { label: 'Tone', placeholder: 'e.g., pale, tan, olive, dark' },
    condition: { label: 'Condition', placeholder: 'e.g., clear, freckled, scarred' },
  };

  // Merge all region appearances
  Object.assign(out, HEAD_APPEARANCE);
  Object.assign(out, NECK_APPEARANCE);
  Object.assign(out, UPPER_BODY_APPEARANCE);
  Object.assign(out, TORSO_APPEARANCE);
  Object.assign(out, ARMS_APPEARANCE);
  Object.assign(out, GROIN_APPEARANCE);
  Object.assign(out, LEGS_APPEARANCE);
  Object.assign(out, FEET_APPEARANCE);

  return out;
}

export const APPEARANCE_REGION_ATTRIBUTES: Record<
  AppearanceRegion,
  Record<string, AppearanceAttributeDef>
> = buildAppearanceRegionAttributes();

/**
 * Get attributes available for a given region.
 */
export function getRegionAttributes(
  region: AppearanceRegion
): Record<string, AppearanceAttributeDef> {
  return getRecord(APPEARANCE_REGION_ATTRIBUTES, region);
}

/**
 * Get the first attribute key for a region (default selection).
 */
export function getDefaultAttribute(region: AppearanceRegion): string {
  const attrs = getRecord(APPEARANCE_REGION_ATTRIBUTES, region);
  return Object.keys(attrs)[0] ?? '';
}

/**
 * Human-readable labels for appearance regions.
 */
function regionToLabel(region: string): string {
  const spaced = region
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildAppearanceRegionLabels(): Record<AppearanceRegion, string> {
  const out = {} as Record<AppearanceRegion, string>;

  for (const region of APPEARANCE_REGIONS) {
    setRecord(out, region, regionToLabel(region));
  }

  out.overall = 'Overall Build';
  out.eyes = 'Eyes';
  out.skin = 'Skin';

  return out;
}

export const APPEARANCE_REGION_LABELS: Record<AppearanceRegion, string> =
  buildAppearanceRegionLabels();
