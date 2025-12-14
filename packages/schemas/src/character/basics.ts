import { z } from 'zod';
import { CoreIdentitySchema } from '../shared/basics.js';
import { NpcTierSchema } from '../npc-tier/index.js';

/**
 * Character basics schema - extends core identity with character-specific fields.
 *
 * Shared fields (id, name, age, gender, summary) are defined in:
 * @see ../shared/basics.ts - CoreIdentitySchema
 */
export const CharacterBasicsSchema = CoreIdentitySchema.extend({
  backstory: z.string().min(1),
  tags: z.array(z.string().min(1)).default(['draft']),

  /**
   * NPC tier classification.
   * Determines simulation priority, profile depth, and persistence behavior.
   * Defaults to 'minor' for new characters.
   *
   * @see ../npc-tier/types.ts - NpcTier
   */
  tier: NpcTierSchema.default('minor'),
});

export type CharacterBasics = z.infer<typeof CharacterBasicsSchema>;
