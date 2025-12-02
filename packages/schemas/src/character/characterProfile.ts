// Composite character profile schema and type used across the app
import { z } from 'zod';
import { PhysiqueSchema, type Physique } from './appearance.js';
import { CharacterPersonalitySchema } from './personality.js';
import { ScentSchema, type Scent } from './scent.js';
import { CharacterBasicsSchema, type CharacterBasics } from './basics.js';
import { CharacterDetailSchema, type CharacterDetail } from './details.js';

export const CharacterProfileSchema = CharacterBasicsSchema.extend({
  // personality can be a simple string or an array of strings
  personality: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  // physique can be machine-readable object or free-text appearance notes
  physique: z.union([z.string().min(1), PhysiqueSchema]).optional(),
  scent: ScentSchema.optional(),
  speakingStyle: z.string().min(1),
  // style hints mirror the personality speechStyle keys; all optional
  style: CharacterPersonalitySchema.shape.speechStyle.optional(),
  // flexible facts for future knowledge-node/RAG experiments
  details: z.array(CharacterDetailSchema).max(32).optional(),
});

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

// Useful named re-exports for consumers
export type { Physique, Scent, CharacterBasics, CharacterDetail };
