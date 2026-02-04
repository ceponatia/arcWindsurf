import { z } from 'zod';
import { PersonaBasicsSchema, type PersonaBasics } from './basics.js';
import { PersonaAppearanceSchema, type PersonaAppearance, type Physique } from './appearance.js';
import { BodyMapSchema, type BodyMap } from '../character/body-map.js';

/**
 * Persona Profile Schema - represents a player character for a session.
 *
 * Unlike CharacterProfile, PersonaProfile omits personality and NPC-specific
 * fields since the player is in full control. It focuses on:
 * - Identity (name, age, summary)
 * - Physical appearance (structured or free-text)
 * - Optional body map for detailed sensory descriptions
 *
 * This schema is used by:
 * - Persona builder UI (web client)
 * - Session initialization (API)
 * - Context injection for LLM prompts
 */
export const PersonaProfileSchema = PersonaBasicsSchema.extend({
  /**
   * Physical appearance - can be free-text or structured physique data.
   * Optional to allow minimal persona creation.
   */
  appearance: PersonaAppearanceSchema.optional(),

  /**
   * Body map with per-region sensory data (scent, texture, visual, flavor).
   * Provides atomic access to body parts for detailed sensory descriptions.
   * Optional - only specify regions with notable characteristics.
   */
  body: BodyMapSchema.optional(),
});

export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;

// Re-export useful types for consumers
export type { PersonaBasics, PersonaAppearance, Physique, BodyMap };
