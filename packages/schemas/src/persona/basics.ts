import { z } from 'zod';
import { CoreIdentitySchema } from '../shared/basics.js';

/**
 * Persona basics schema - core identification for player character.
 * Extends CoreIdentity with persona-specific constraints (max summary length).
 *
 * Shared fields (id, name, age, gender, summary) are defined in:
 * @see ../shared/basics.ts - CoreIdentitySchema
 */
export const PersonaBasicsSchema = CoreIdentitySchema.extend({
  /** Brief summary/description of the persona (persona-specific: limited to 500 chars) */
  summary: z.string().min(1).max(500),
});

export type PersonaBasics = z.infer<typeof PersonaBasicsSchema>;
