// Composite character profile schema and type used across the app
import { z } from 'zod';
import { PhysiqueSchema, type Physique } from './appearance.js';
import { BodyMapSchema } from './sensory.js';
import { SensoryProfileConfigSchema } from './sensoryProfileConfig.js';
import { CharacterBasicsSchema, type CharacterBasics } from './basics.js';
import { CharacterDetailSchema, type CharacterDetail } from './details.js';
import { PersonalityMapSchema, type PersonalityMap } from './personality.js';
import { NpcHygieneStateSchema, type NpcHygieneState } from '../state/hygiene.js';

export const CharacterProfileSchema = CharacterBasicsSchema.extend({
  // personality can be a simple string or an array of strings
  personality: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  // physique can be machine-readable object or free-text appearance notes
  physique: z.union([z.string().min(1), PhysiqueSchema]).optional(),

  /**
   * Profile picture URL for display in chat UI.
   * User-uploadable via character builder.
   */
  profilePic: z.string().url().optional(),

  /**
   * Emote picture URL for dynamic emotional expressions.
   * Not user-editable - reserved for future image generation pipeline.
   */
  emotePic: z.string().url().optional(),

  /**
   * Body map with per-region sensory data (scent, texture, visual, flavor).
   * Provides atomic access to body parts for detailed sensory descriptions.
   */
  body: BodyMapSchema.optional(),

  /**
   * Sensory profile configuration for auto-defaults and templates.
   */
  sensoryProfile: SensoryProfileConfigSchema.optional(),

  /**
   * Hygiene state tracking cleanliness levels per body part.
   * Used to dynamically modify sensory data (scent, texture, visual).
   */
  hygiene: NpcHygieneStateSchema.optional(),

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
export type { Physique, CharacterBasics, CharacterDetail, PersonalityMap, NpcHygieneState };
