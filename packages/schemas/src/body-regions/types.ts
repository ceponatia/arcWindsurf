export type BodySide = 'left' | 'right';

/**
 * The high-level body group buckets used for batch operations (hygiene, defaults).
 */
export const BODY_REGION_GROUP_KEYS = [
  'head',
  'neck',
  'upperBody',
  'torso',
  'arms',
  'groin',
  'legs',
  'feet',
] as const;

export type BodyRegionGroupKey = (typeof BODY_REGION_GROUP_KEYS)[number];

// ============================================================================
// Appearance Attributes
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
