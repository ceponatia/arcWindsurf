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
  /** Placeholder text for text inputs */
  placeholder?: string;
}

/**
 * Attributes available for each appearance region.
 */
export const APPEARANCE_REGION_ATTRIBUTES: Record<
  AppearanceRegion,
  Record<string, AppearanceAttributeDef>
> = {
  // General build
  overall: {
    height: { label: 'Height', values: APPEARANCE_HEIGHTS },
    build: { label: 'Build', values: APPEARANCE_TORSOS },
  },

  // Appearance-specific regions (not in BODY_REGIONS)
  eyes: {
    color: { label: 'Color', placeholder: 'e.g., brown, blue, green' },
    shape: { label: 'Shape', placeholder: 'e.g., almond, round, hooded' },
  },
  skin: {
    tone: { label: 'Tone', placeholder: 'e.g., pale, tan, olive, dark' },
    condition: { label: 'Condition', placeholder: 'e.g., clear, freckled, scarred' },
  },

  // Head & Face
  head: {
    shape: { label: 'Shape', placeholder: 'e.g., round, oval, square' },
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
  },
  face: {
    shape: { label: 'Shape', placeholder: 'e.g., oval, round, angular' },
    features: { label: 'Features', placeholder: 'e.g., high cheekbones, strong jaw' },
  },
  ears: {
    shape: { label: 'Shape', placeholder: 'e.g., small, pointed, rounded' },
    description: { label: 'Description', placeholder: 'e.g., pierced, elven' },
  },
  mouth: {
    lips: { label: 'Lips', placeholder: 'e.g., full, thin, pouty' },
    description: { label: 'Description', placeholder: 'e.g., often smiling' },
  },
  hair: {
    color: { label: 'Color', placeholder: 'e.g., brown, auburn, blonde' },
    style: { label: 'Style', placeholder: 'e.g., straight, wavy, curly' },
    length: { label: 'Length', placeholder: 'e.g., short, medium, long' },
  },

  // Neck & Throat
  neck: {
    length: { label: 'Length', placeholder: 'e.g., short, average, long' },
    description: { label: 'Description', placeholder: 'e.g., slender, muscular' },
  },
  throat: {
    description: { label: 'Description', placeholder: "e.g., smooth, prominent adam's apple" },
  },

  // Upper Body
  shoulders: {
    width: { label: 'Width', placeholder: 'e.g., narrow, average, broad' },
    description: { label: 'Description', placeholder: 'e.g., squared, sloped' },
  },
  chest: {
    build: { label: 'Build', placeholder: 'e.g., flat, muscular, broad' },
    description: { label: 'Description', placeholder: 'e.g., hairy, smooth' },
  },
  breasts: {
    size: { label: 'Size', placeholder: 'e.g., small, medium, large' },
    shape: { label: 'Shape', placeholder: 'e.g., rounded, teardrop, perky' },
  },
  nipples: {
    color: { label: 'Color', placeholder: 'e.g., pink, brown, dark' },
    description: { label: 'Description', placeholder: 'e.g., small, puffy' },
  },
  back: {
    build: { label: 'Build', placeholder: 'e.g., narrow, broad, muscular' },
    description: { label: 'Description', placeholder: 'e.g., scarred, smooth' },
  },
  lowerBack: {
    description: { label: 'Description', placeholder: 'e.g., dimples, tattoo' },
  },

  // Torso
  torso: {
    build: { label: 'Build', values: APPEARANCE_TORSOS },
    description: { label: 'Description', placeholder: 'e.g., smooth, hairy' },
  },
  abdomen: {
    build: { label: 'Build', placeholder: 'e.g., flat, toned, soft' },
    description: { label: 'Description', placeholder: 'e.g., defined abs' },
  },
  navel: {
    shape: { label: 'Shape', placeholder: 'e.g., innie, outie' },
    description: { label: 'Description', placeholder: 'e.g., pierced' },
  },
  armpits: {
    grooming: { label: 'Grooming', placeholder: 'e.g., shaved, natural' },
    description: { label: 'Description', placeholder: 'e.g., smooth' },
  },
  waist: {
    width: { label: 'Width', placeholder: 'e.g., narrow, average, wide' },
    description: { label: 'Description', placeholder: 'e.g., cinched, soft' },
  },

  // Arms & Hands
  arms: {
    build: { label: 'Build', values: APPEARANCE_ARMS_BUILD },
    length: { label: 'Length', values: APPEARANCE_ARMS_LENGTH },
  },
  hands: {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    description: { label: 'Description', placeholder: 'e.g., calloused, soft, manicured' },
  },

  // Hips & Lower Body
  hips: {
    width: { label: 'Width', placeholder: 'e.g., narrow, average, wide' },
    description: { label: 'Description', placeholder: 'e.g., curvy, straight' },
  },
  groin: {
    grooming: { label: 'Grooming', placeholder: 'e.g., shaved, trimmed, natural' },
    description: { label: 'Description', placeholder: 'e.g., appearance details' },
  },
  buttocks: {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    shape: { label: 'Shape', placeholder: 'e.g., round, flat, toned' },
  },
  anus: {
    description: { label: 'Description', placeholder: 'e.g., puckered, smooth' },
  },
  penis: {
    size: { label: 'Size', placeholder: 'e.g., small, average, large' },
    description: { label: 'Description', placeholder: 'e.g., circumcised' },
  },
  vagina: {
    description: { label: 'Description', placeholder: 'e.g., appearance details' },
    labia: { label: 'Labia', placeholder: 'e.g., puffy, smooth' },
    clitoris: { label: 'Clitoris', placeholder: 'e.g., prominent, hidden' },
    opening: { label: 'Opening', placeholder: 'e.g., tight, relaxed' },
  },

  // Legs & Feet
  legs: {
    build: { label: 'Build', values: APPEARANCE_LEGS_BUILD },
    length: { label: 'Length', values: APPEARANCE_LEGS_LENGTH },
  },
  thighs: {
    build: { label: 'Build', placeholder: 'e.g., slender, toned, thick' },
    description: { label: 'Description', placeholder: 'e.g., muscular, soft' },
  },
  knees: {
    description: { label: 'Description', placeholder: 'e.g., bony, dimpled' },
  },
  calves: {
    build: { label: 'Build', placeholder: 'e.g., slender, toned, muscular' },
    description: { label: 'Description', placeholder: 'e.g., defined' },
  },
  ankles: {
    size: { label: 'Size', placeholder: 'e.g., thin, average, thick' },
    description: { label: 'Description', placeholder: 'e.g., delicate' },
  },
  feet: {
    size: { label: 'Size', values: APPEARANCE_FEET_SIZES },
    shape: { label: 'Shape', placeholder: 'e.g., narrow, wide, average' },
  },
  toes: {
    length: { label: 'Length', placeholder: 'e.g., short, average, long' },
    description: { label: 'Description', placeholder: 'e.g., painted nails' },
  },
};

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
export const APPEARANCE_REGION_LABELS: Record<AppearanceRegion, string> = {
  // General
  overall: 'Overall Build',

  // Appearance-specific regions (not in BODY_REGIONS)
  eyes: 'Eyes',
  skin: 'Skin',

  // Head & Face
  head: 'Head',
  face: 'Face',
  ears: 'Ears',
  mouth: 'Mouth',
  hair: 'Hair',

  // Neck & Throat
  neck: 'Neck',
  throat: 'Throat',

  // Upper Body
  shoulders: 'Shoulders',
  chest: 'Chest',
  breasts: 'Breasts',
  nipples: 'Nipples',
  back: 'Back',
  lowerBack: 'Lower Back',

  // Torso
  torso: 'Torso',
  abdomen: 'Abdomen',
  navel: 'Navel',
  armpits: 'Armpits',
  waist: 'Waist',

  // Arms & Hands
  arms: 'Arms',
  hands: 'Hands',

  // Hips & Lower Body
  hips: 'Hips',
  groin: 'Groin',
  buttocks: 'Buttocks',
  anus: 'Anus',
  penis: 'Penis',
  vagina: 'Vagina',

  // Legs & Feet
  legs: 'Legs',
  thighs: 'Thighs',
  knees: 'Knees',
  calves: 'Calves',
  ankles: 'Ankles',
  feet: 'Feet',
  toes: 'Toes',
};
