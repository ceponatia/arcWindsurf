import { z } from 'zod';

/**
 * Reuse the appearance types from shared schema.
 *
 * PhysiqueSchema (build + appearance) and all enums are defined in:
 * @see ../shared/physique.ts
 */
import { PhysiqueSchema, type Physique } from '../shared/physique.js';

/**
 * Persona appearance - reuses the character physique system.
 * Can be either a free-text description or a structured physique object.
 */
export const PersonaAppearanceSchema = z.union([
  z.string().min(1, { message: 'Appearance description is required' }),
  PhysiqueSchema,
]);

export type PersonaAppearance = z.infer<typeof PersonaAppearanceSchema>;

// Re-export Physique type for convenience
export type { Physique };
