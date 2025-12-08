/**
 * Shared types for the generator package.
 * Domain-specific types live in their respective domain folders.
 */

/**
 * Weighted value for random selection.
 * Higher weights = higher probability of selection.
 */
export interface WeightedValue<T> {
  value: T;
  weight: number;
}

/**
 * A pool of values that can be randomly selected from.
 * Can be a simple array or weighted values for biased selection.
 */
export type ValuePool<T> = readonly T[] | readonly WeightedValue<T>[];

/**
 * Generation mode determines how existing values are handled.
 */
export type GenerationMode =
  /** Only fill fields that are empty/undefined */
  | 'fill-empty'
  /** Overwrite all fields, ignoring existing values */
  | 'overwrite-all';

/**
 * Base options shared by all generators.
 */
export interface BaseGeneratorOptions {
  /** How to handle existing values */
  mode?: GenerationMode;
  /** Random seed for reproducible generation (optional) */
  seed?: number;
}

/**
 * Result metadata from generation.
 */
export interface GenerationMeta {
  /** Theme ID used for generation */
  themeId: string;
  /** Fields that were generated (not preserved from existing) */
  generatedFields: string[];
  /** Fields that were skipped due to filtering (e.g., gender) */
  skippedFields: string[];
  /** Timestamp of generation */
  generatedAt: string;
}
