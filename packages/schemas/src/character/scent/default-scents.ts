import type { BodyRegion } from '../regions.js';
import type { RegionScent } from '../../body-regions/sensory-types.js';
import { ALL_HYGIENE_MODIFIERS, ALL_DEFAULT_SCENTS } from '../../body-regions/hygiene-data.js';

export const DEFAULT_SCENTS: Partial<Record<BodyRegion, RegionScent>> = ALL_DEFAULT_SCENTS;

/**
 * Hygiene-level scent modifiers for hygiene-modulated regions.
 *
 * These are intentionally high-level and can be refined later; they should stay
 * safe and non-explicit.
 */
export const HYGIENE_SCENT_MODIFIERS = ALL_HYGIENE_MODIFIERS;
