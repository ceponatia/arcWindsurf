// Shared types for @minimal-rpg/utils

// =============================================================================
// Result Types
// =============================================================================

/**
 * A discriminated union representing either a success or failure result.
 * Use for operations that can fail without throwing exceptions.
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Creates a successful Result.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Creates a failed Result.
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Recursive partial type for nested objects.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
  ? DeepPartial<U>[]
  : T[P] extends object | undefined
  ? DeepPartial<T[P]>
  : T[P];
};

/**
 * Represents a single state change slice.
 */
export interface StateSlice<T> {
  key: string;
  baseline: T;
  overrides: DeepPartial<T>;
  effective: T;
}
