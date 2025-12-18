/**
 * Prompt helper types for the NPC domain.
 */

/**
 * A list of prompt lines to be appended into a larger prompt.
 *
 * Keep these as plain strings so callers can assemble efficiently.
 */
export type PromptLines = string[];

/**
 * A min/max numeric range.
 */
export interface NumberRange {
  min: number;
  max: number;
}
