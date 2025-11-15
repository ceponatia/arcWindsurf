// Character submodule barrel + composite profile schema
import { z } from 'zod'
import { AppearanceSchema, type Appearance } from './appearance.js'
import { CharacterPersonalitySchema } from './personality.js'
import { ScentSchema, type Scent } from './scent.js'
import { CharacterBasicsSchema, type CharacterBasics } from './basics.js'

// Re-export leaf schemas/types for flat imports
export * from './appearance.js'
export * from './personality.js'
export * from './scent.js'
export * from './basics.js'

// Composite character profile schema and type used across the app
export const CharacterProfileSchema = CharacterBasicsSchema.extend({
	// personality can be a simple string or an array of strings
	personality: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
	// appearance can be machine-readable object or free-text
	appearance: z.union([z.string().min(1), AppearanceSchema]).optional(),
	scent: ScentSchema.optional(),
	// goals are required non-empty strings
	goals: z.array(z.string().min(1)).nonempty(),
	speakingStyle: z.string().min(1),
	// style hints mirror the personality speechStyle keys; all optional
	style: CharacterPersonalitySchema.shape.speechStyle.optional(),
})

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>

// Useful named re-exports for consumers
export type { Appearance, Scent, CharacterBasics }