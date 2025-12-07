import { z } from 'zod';

// ============================================================================
// Appearance Region Taxonomy
// ============================================================================
// Defines appearance regions and their attributes for character building.
// Similar to body.ts for sensory data, this provides:
// - Atomic access to specific appearance attributes
// - Region-based organization for structured physique data
// - Dynamic attribute specification per region
// ============================================================================

/**
 * Appearance regions - areas that have specific appearance attributes.
 */
export const APPEARANCE_REGIONS = [
  'overall',
  'hair',
  'eyes',
  'skin',
  'face',
  'arms',
  'legs',
  'feet',
] as const;

export type AppearanceRegion = (typeof APPEARANCE_REGIONS)[number];

// Single sources of truth for build/physique enums
export const APPEARANCE_HEIGHTS = ['dwarfish', 'short', 'average', 'tall', 'giant'] as const;
export type AppearanceHeight = (typeof APPEARANCE_HEIGHTS)[number];

export const APPEARANCE_TORSOS = [
  'lithe',
  'nubile',
  'average',
  'athletic',
  'heavy',
  'obese',
] as const;
export type AppearanceTorso = (typeof APPEARANCE_TORSOS)[number];

export const APPEARANCE_ARMS_BUILD = [
  'very skinny',
  'slender',
  'average',
  'toned',
  'muscular',
] as const;
export type AppearanceArmsBuild = (typeof APPEARANCE_ARMS_BUILD)[number];

export const APPEARANCE_ARMS_LENGTH = ['average', 'long', 'short'] as const;
export type AppearanceArmsLength = (typeof APPEARANCE_ARMS_LENGTH)[number];

export const APPEARANCE_LEGS_LENGTH = ['average', 'long', 'short'] as const;
export type AppearanceLegsLength = (typeof APPEARANCE_LEGS_LENGTH)[number];

export const APPEARANCE_FEET_SIZES = ['tiny', 'petite', 'small', 'average', 'large'] as const;
export type AppearanceFeetSize = (typeof APPEARANCE_FEET_SIZES)[number];

export const APPEARANCE_LEGS_BUILD = [
  'very skinny',
  'slender',
  'average',
  'toned',
  'muscular',
] as const;
export type AppearanceLegsBuild = (typeof APPEARANCE_LEGS_BUILD)[number];

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
  overall: {
    height: { label: 'Height', values: APPEARANCE_HEIGHTS },
    build: { label: 'Build', values: APPEARANCE_TORSOS },
  },
  hair: {
    color: { label: 'Color', placeholder: 'e.g., brown, auburn, blonde' },
    style: { label: 'Style', placeholder: 'e.g., straight, wavy, curly' },
    length: { label: 'Length', placeholder: 'e.g., short, medium, long' },
  },
  eyes: {
    color: { label: 'Color', placeholder: 'e.g., brown, blue, green' },
    shape: { label: 'Shape', placeholder: 'e.g., almond, round, hooded' },
  },
  skin: {
    tone: { label: 'Tone', placeholder: 'e.g., pale, tan, olive, dark' },
    condition: { label: 'Condition', placeholder: 'e.g., clear, freckled, scarred' },
  },
  face: {
    shape: { label: 'Shape', placeholder: 'e.g., oval, round, angular' },
    features: { label: 'Features', placeholder: 'e.g., high cheekbones, strong jaw' },
  },
  arms: {
    build: { label: 'Build', values: APPEARANCE_ARMS_BUILD },
    length: { label: 'Length', values: APPEARANCE_ARMS_LENGTH },
  },
  legs: {
    build: { label: 'Build', values: APPEARANCE_LEGS_BUILD },
    length: { label: 'Length', values: APPEARANCE_LEGS_LENGTH },
  },
  feet: {
    size: { label: 'Size', values: APPEARANCE_FEET_SIZES },
    shape: { label: 'Shape', placeholder: 'e.g., narrow, wide, average' },
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
  overall: 'Overall Build',
  hair: 'Hair',
  eyes: 'Eyes',
  skin: 'Skin',
  face: 'Face',
  arms: 'Arms',
  legs: 'Legs',
  feet: 'Feet',
};

// Build: proportions, shape, physique, base skin
export const BuildSchema = z.object({
  height: z.enum(APPEARANCE_HEIGHTS).default('average'),
  torso: z.enum(APPEARANCE_TORSOS).default('average'),
  skinTone: z.string().min(1).default('pale'),
  arms: z.object({
    build: z.enum(APPEARANCE_ARMS_BUILD).default('average'),
    length: z.enum(APPEARANCE_ARMS_LENGTH).default('average'),
  }),
  legs: z.object({
    length: z.enum(APPEARANCE_LEGS_LENGTH).default('average'),
    build: z.enum(APPEARANCE_LEGS_BUILD).default('toned'),
  }),
  feet: z.object({
    size: z.enum(APPEARANCE_FEET_SIZES).default('small'),
    shape: z.string().min(1).default('average'),
  }),
});

export type Build = z.infer<typeof BuildSchema>;

// Appearance: hair, eyes, distinguishing marks, etc.
export const AppearanceSchema = z.object({
  hair: z.object({
    color: z.string().min(1).default('brown'),
    style: z.string().min(1).default('straight'),
    length: z.string().min(1).default('medium'),
  }),
  eyes: z.object({
    color: z.string().min(1).default('brown'),
  }),
  features: z.array(z.string().min(1)).optional(),
});

export type Appearance = z.infer<typeof AppearanceSchema>;

// Combined physical description bucket
export const PhysiqueSchema = z.object({
  build: BuildSchema,
  appearance: AppearanceSchema,
});

export type Physique = z.infer<typeof PhysiqueSchema>;
