import { z } from 'zod';
import { CoreIdentitySchema } from '../shared/basics.js';

/**
 * Character basics schema - extends core identity with character-specific fields.
 *
 * Shared fields (id, name, age, gender, summary) are defined in:
 * @see ../shared/basics.ts - CoreIdentitySchema
 */
export const CharacterBasicsSchema = CoreIdentitySchema.extend({
  backstory: z.string().min(1),
  tags: z.array(z.string().min(1)).default(['draft']),
});

export type CharacterBasics = z.infer<typeof CharacterBasicsSchema>;
