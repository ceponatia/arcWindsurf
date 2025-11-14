// Domain types for shared usage across API and Web

/**
 * Character profile used to define in-world personas.
 * Fields are readonly to encourage immutability across consumers.
 */
export interface CharacterProfile {
  readonly id: string
  readonly name: string
  readonly summary: string
  readonly backstory: string
  readonly personality: string
  readonly goals: readonly string[]
  readonly speakingStyle: string
  readonly tags?: readonly string[]
}

/**
 * Setting profile describing the world/context the story takes place in.
 */
export interface SettingProfile {
  readonly id: string
  readonly name: string
  readonly lore: string
  readonly tone: string
  readonly constraints?: readonly string[]
}
