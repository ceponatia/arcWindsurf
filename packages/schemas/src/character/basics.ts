import { z } from 'zod';
import { CoreIdentitySchema } from '../shared/basics.js';
import { NpcTierSchema } from '../npc-tier/index.js';
import { RACES, SUBRACES } from '../races/index.js';

// Re-export race types for backwards compatibility
export { RACES, SUBRACES, RACE_SUBRACES } from '../races/index.js';
export type { Race, Subrace } from '../races/index.js';

export const ALIGNMENTS = [
  'Chaotic Evil',
  'Chaotic Neutral',
  'Chaotic Good',
  'True Neutral',
  'Lawful Evil',
  'Lawful Neutral',
  'Lawful Good',
] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

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
   * Character alignment.
   */
  alignment: z.enum(ALIGNMENTS).optional(),

  /**
   * Character race.
   */
  race: z.enum(RACES),

  /**
   * Character subrace (optional, depends on race).
   */
  subrace: z.enum(SUBRACES).optional(),

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
