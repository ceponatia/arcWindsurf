import { z } from 'zod';

// ============================================================================
// Legacy Scent Schema (Backwards Compatibility)
// ============================================================================
// This flat schema is retained for backwards compatibility with existing
// character data. New characters should use the BodyMap schema which provides
// richer, per-region sensory data.
//
// See: ./body.ts for the new BodyMapSchema
// ============================================================================

/**
 * Legacy scent descriptors for basic character scent data.
 * @deprecated Use BodyMapSchema for new characters - it provides per-region scents.
 */
export const ScentSchema = z
  .object({
    /** Scent of the character's hair */
    hairScent: z.string().optional(),
    /** General body scent (maps to torso in BodyMap) */
    bodyScent: z.string().optional(),
    /** Perfume or applied fragrance */
    perfume: z.string().optional(),
  })
  .partial();

export type Scent = z.infer<typeof ScentSchema>;

// Re-export body region scent types for convenience
export {
  RegionScentSchema,
  type RegionScent,
  getRegionScent,
  buildLegacyScentSummary,
} from './body.js';
