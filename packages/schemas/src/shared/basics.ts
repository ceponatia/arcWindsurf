import { z } from 'zod';

/**
 * Gender options for characters and personas.
 */
export const GENDERS = ['male', 'female', 'other', 'unknown'] as const;
export type Gender = (typeof GENDERS)[number];

/**
 * Core identity fields shared between Character and Persona.
 * These are the essential fields that both NPCs and player characters need.
 */
export const CoreIdentitySchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),

  /** Display name */
  name: z.string().min(1, { message: 'Name is required' }).max(120),

  /** Optional age */
  age: z.number().int().positive().optional(),

  /** Optional gender identity */
  gender: z.enum(GENDERS).optional(),

  /** Brief summary/description */
  summary: z.string().min(1),
});

export type CoreIdentity = z.infer<typeof CoreIdentitySchema>;
