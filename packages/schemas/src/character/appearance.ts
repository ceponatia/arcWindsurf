import { BODY_REGIONS } from './regions.js';

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

// ============================================================================
// Appearance Region Taxonomy
// ============================================================================
// Defines appearance regions and their attributes for character building.
// Uses canonical BODY_REGIONS from regions.ts plus 'overall' for general build.
// ============================================================================

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

// ============================================================================
// Region Attributes Configuration
// ============================================================================
// Defines what attributes are available for each appearance region.
// Used by the character builder to dynamically render attribute dropdowns.
// ============================================================================

/**
 * Attribute definitions with optional preset values.
 * If `values` is provided, a dropdown is shown; otherwise a text input.
 */
export interface AppearanceAttributeDef {
  /** Display label for the attribute */
  label: string;
  /** Preset values for dropdown, or undefined for free text */
  values?: readonly string[];
  /** Placeholder for free text inputs */
  placeholder?: string;
}

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
    out[region] = DEFAULT_REGION_ATTRIBUTES;
  }

  // General build
  out.overall = {
    height: { label: 'Height', values: APPEARANCE_HEIGHTS },
    build: { label: 'Build', values: APPEARANCE_TORSOS },
  };

  // Appearance-specific regions (not in BODY_REGIONS)
  out.eyes = {
    color: { label: 'Color', placeholder: 'e.g., brown, blue, green' },
    shape: { label: 'Shape', placeholder: 'e.g., almond, round, hooded' },
  };
  out.skin = {
    tone: { label: 'Tone', placeholder: 'e.g., pale, tan, olive, dark' },
    condition: { label: 'Condition', placeholder: 'e.g., clear, freckled, scarred' },
  };

  // Commonly-edited regions
  out.hair = {
    color: { label: 'Color', placeholder: 'e.g., black, brown, blonde, red' },
    style: { label: 'Style', placeholder: 'e.g., long, short, braided, messy' },
  };

  out.leftFoot = {
    size: { label: 'Size', values: APPEARANCE_FEET_SIZES },
    shape: { label: 'Shape', placeholder: 'e.g., narrow, wide, average' },
  };
  out.rightFoot = out.leftFoot;

  out.leftHand = {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    description: { label: 'Description', placeholder: 'e.g., calloused' },
  };
  out.rightHand = out.leftHand;

  out.leftArm = {
    build: { label: 'Build', values: APPEARANCE_ARMS_BUILD },
    length: { label: 'Length', values: APPEARANCE_ARMS_LENGTH },
  };
  out.rightArm = out.leftArm;

  out.leftLeg = {
    build: { label: 'Build', values: APPEARANCE_LEGS_BUILD },
    length: { label: 'Length', values: APPEARANCE_LEGS_LENGTH },
  };
  out.rightLeg = out.leftLeg;

  out.leftBreast = {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    shape: { label: 'Shape', placeholder: 'e.g., perky, full, soft' },
  };
  out.rightBreast = out.leftBreast;

  out.leftNipple = {
    description: { label: 'Description', placeholder: 'e.g., small, prominent' },
  };
  out.rightNipple = out.leftNipple;

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
  return APPEARANCE_REGION_ATTRIBUTES[region];
}

/**
 * Get the first attribute key for a region (default selection).
 */
export function getDefaultAttribute(region: AppearanceRegion): string {
  const attrs = APPEARANCE_REGION_ATTRIBUTES[region];
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
    out[region] = regionToLabel(region);
  }

  out.overall = 'Overall Build';
  out.eyes = 'Eyes';
  out.skin = 'Skin';

  return out;
}

export const APPEARANCE_REGION_LABELS: Record<AppearanceRegion, string> =
  buildAppearanceRegionLabels();
