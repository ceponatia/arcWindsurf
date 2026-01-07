// Shared types for @minimal-rpg/utils

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
