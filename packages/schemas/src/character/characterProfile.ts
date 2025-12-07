// Composite character profile schema and type used across the app
import { z } from 'zod';
import { PhysiqueSchema, type Physique } from './appearance.js';
import { ScentSchema, type Scent } from './scent.js';
import { BodyMapSchema, type BodyMap } from './body.js';
import { CharacterBasicsSchema, type CharacterBasics } from './basics.js';
import { CharacterDetailSchema, type CharacterDetail } from './details.js';
import { PersonalityMapSchema, type PersonalityMap } from './personality.js';

export const CharacterProfileSchema = CharacterBasicsSchema.extend({
  // personality can be a simple string or an array of strings
  personality: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  // physique can be machine-readable object or free-text appearance notes
  physique: z.union([z.string().min(1), PhysiqueSchema]).optional(),

  /**
   * Legacy scent schema - simple flat structure for backwards compatibility.
   * @deprecated Use `body` map for per-region sensory data.
   */
  scent: ScentSchema.optional(),

  /**
   * Body map with per-region sensory data (scent, texture, visual).
   * Provides atomic access to body parts for detailed sensory descriptions.
   * When both `scent` and `body` are present, `body` takes precedence.
   */
  body: BodyMapSchema.optional(),

  /**
   * Structured personality map for NPC agent prompting.
   * Includes Big Five dimensions, emotional baseline, values, fears,
   * social patterns, speech style, and stress responses.
   * Optional: simple `personality` string/array still works for basic cases.
   */
  personalityMap: PersonalityMapSchema.optional(),

  // flexible facts for future knowledge-node/RAG experiments
  details: z.array(CharacterDetailSchema).max(32).optional(),
});

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

// Useful named re-exports for consumers
export type { Physique, Scent, BodyMap, CharacterBasics, CharacterDetail, PersonalityMap };
