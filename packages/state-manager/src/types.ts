import { type Operation } from 'fast-json-patch';
import { type ZodSchema } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * A JSON-serializable value.
 * Used to constrain state objects to values that can be persisted.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * A JSON-serializable object (not array or primitive).
 * State documents must be objects at the root level.
 */
export type JsonObject = Record<string, JsonValue>;

/**
 * Deep partial type that makes all nested properties optional.
 * Used for override objects where any subset of the baseline can be overridden.
 */
export type DeepPartial<T> = T extends JsonValue[]
  ? T // Arrays are treated as atomic values (replaced wholesale)
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for the StateManager.
 */
export interface StateManagerConfig {
  /**
   * Whether to validate state against schemas.
   * When true, getEffectiveState and applyPatches will validate results.
   * @default false
   */
  validateOnMerge?: boolean;

  /**
   * Whether to validate patches before applying.
   * When true, applyPatches will verify the patch is well-formed.
   * @default false
   */
  validatePatches?: boolean;

  /**
   * Whether to compute minimal diffs when generating new overrides.
   * When true, applyPatches returns only the paths that differ from baseline.
   * When false, returns the full effective state (less efficient but simpler).
   * @default true
   */
  computeMinimalDiff?: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_STATE_MANAGER_CONFIG: Required<StateManagerConfig> = {
  validateOnMerge: false,
  validatePatches: false,
  computeMinimalDiff: true,
};

// ============================================================================
// Merge Types
// ============================================================================

/**
 * Options for the getEffectiveState operation.
 */
export interface MergeOptions<T> {
  /**
   * Optional Zod schema to validate the merged result.
   * If provided and validation fails, an error is thrown.
   */
  schema?: ZodSchema<T>;

  /**
   * Whether to clone the baseline before merging.
   * When true, ensures the original baseline is not mutated.
   * @default true
   */
  cloneBaseline?: boolean;
}

/**
 * Result of merging baseline and overrides.
 */
export interface StateMergeResult<T> {
  /** The merged effective state */
  effective: T;

  /** Paths that were overridden (for debugging/logging) */
  overriddenPaths?: string[];
}

// ============================================================================
// Patch Types
// ============================================================================

/**
 * Re-export Operation from fast-json-patch for convenience.
 */
export type { Operation };

/**
 * A validated JSON Patch operation with path tracking.
 * Uses intersection type since Operation is a union type that cannot be extended.
 */
export type ValidatedOperation = Operation & {
  /** Whether this operation was validated */
  validated?: boolean;
};

/**
 * Options for the applyPatches operation.
 */
export interface PatchOptions<T> {
  /**
   * Optional Zod schema to validate the patched result.
   * If provided and validation fails, the operation is rejected.
   */
  schema?: ZodSchema<T>;

  /**
   * Whether to compute minimal overrides (diff against baseline).
   * When true, only paths that differ from baseline are included in newOverrides.
   * @default true (uses config value if not specified)
   */
  computeMinimalDiff?: boolean;

  /**
   * Whether to validate patches before applying.
   * @default false (uses config value if not specified)
   */
  validatePatches?: boolean;

  /**
   * Whether to allow patches that would create invalid state.
   * When false (default), invalid patches throw an error.
   * When true, invalid patches are skipped and reported in the result.
   * @default false
   */
  allowPartialFailure?: boolean;
}

/**
 * Result of applying patches.
 */
export interface StatePatchResult<T> {
  /** The new overrides to persist (diff from baseline, or full state if diff disabled) */
  newOverrides: DeepPartial<T>;

  /** The new effective state after patches are applied */
  newEffective: T;

  /** Paths that were modified by the patches */
  modifiedPaths: string[];

  /** Number of patches successfully applied */
  patchesApplied: number;

  /** Patches that failed to apply (only populated if allowPartialFailure is true) */
  failedPatches?: FailedPatch[];
}

/**
 * Information about a patch that failed to apply.
 */
export interface FailedPatch {
  /** The patch operation that failed */
  operation: Operation;

  /** The index of the patch in the original array */
  index: number;

  /** Error message describing why the patch failed */
  error: string;
}

// ============================================================================
// Diff Types
// ============================================================================

/**
 * Result of comparing two state objects.
 */
export interface DiffResult<T> {
  /** The computed difference (can be applied to source to get target) */
  diff: DeepPartial<T>;

  /** Paths that were added in target */
  addedPaths: string[];

  /** Paths that were removed in target */
  removedPaths: string[];

  /** Paths that were modified in target */
  modifiedPaths: string[];

  /** Whether the objects are identical */
  isIdentical: boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating state against a schema.
 */
export interface ValidationResult<T> {
  /** Whether validation succeeded */
  success: boolean;

  /** The validated data (only present if success is true) */
  data?: T;

  /** Validation errors (only present if success is false) */
  errors?: ValidationError[];
}

/**
 * A single validation error.
 */
export interface ValidationError {
  /** The path to the invalid value */
  path: string;

  /** The error message */
  message: string;

  /** The invalid value (for debugging) */
  value?: unknown;
}

// ============================================================================
// State Snapshot Types
// ============================================================================

/**
 * A complete state snapshot with metadata.
 * Used for persistence and audit trails.
 */
export interface StateSnapshot<T> {
  /** The baseline state (immutable template) */
  baseline: T;

  /** The current overrides */
  overrides: DeepPartial<T>;

  /** The computed effective state */
  effective: T;

  /** When this snapshot was created */
  createdAt: Date;

  /** Version number for optimistic concurrency */
  version: number;
}

/**
 * Metadata about a state change.
 */
export interface StateChangeMetadata {
  /** Unique identifier for this change */
  changeId: string;

  /** When the change was made */
  timestamp: Date;

  /** Who/what initiated the change */
  source: StateChangeSource;

  /** Optional description of the change */
  description?: string;
}

/**
 * Source of a state change.
 */
export type StateChangeSource =
  | { type: 'agent'; agentType: string }
  | { type: 'user'; userId?: string }
  | { type: 'system'; reason: string };

// ============================================================================
// Action Tracking Types
// ============================================================================

/**
 * A scene action that was performed and can be observed by NPCs.
 */
export interface SceneAction {
  /** Unique identifier for the action */
  id: string;

  /** ID of the entity that performed the action */
  actorId: string;

  /** Type of action (speech, action, thought, observation, etc.) */
  type: 'speech' | 'action' | 'thought' | 'observation' | 'other';

  /** Description or content of the action */
  content: string;

  /** Timestamp when the action occurred */
  timestamp: number;

  /** List of entity IDs who can observe this action */
  observableBy: string[];

  /** Location where the action occurred */
  locationId?: string;

  /** Additional metadata about the action */
  metadata?: Record<string, JsonValue>;
}

// ============================================================================
// State Slice Types
// ============================================================================

/**
 * Merge strategy for combining baseline and overrides.
 */
export type MergeStrategy = 'deep' | 'replace' | 'custom';

/**
 * A registered state slice with schema and merge configuration.
 * Slices allow adding new state categories without modifying the core manager.
 */
export interface StateSlice<T = unknown> {
  /** Unique key for this slice (e.g., 'proximity', 'inventory', 'dialogue') */
  key: string;

  /** Zod schema for validation */
  schema: ZodSchema<T>;

  /** Default/empty state used when no baseline is provided */
  defaultState: T;

  /** How to merge baseline + overrides (deep-merge is default) */
  mergeStrategy?: MergeStrategy;

  /** Optional custom merge function (required if mergeStrategy is 'custom') */
  customMerge?: (baseline: T, overrides: DeepPartial<T>) => T;
}

/**
 * State patches keyed by slice name.
 * Used when tools return patches for multiple slices.
 */
export type StatePatches = Record<string, Operation[]>;

/**
 * Input for multi-slice patch operations.
 */
export interface SliceState<T = unknown> {
  baseline: T;
  overrides: DeepPartial<T>;
}

/**
 * Result of applying patches to multiple slices.
 */
export interface MultiSlicePatchResult {
  /** Results per slice (keyed by slice key) */
  results: Record<string, StatePatchResult<unknown>>;

  /** Whether all patches across all slices succeeded */
  allSucceeded: boolean;

  /** Slices that had failures (only populated if there were failures) */
  failedSlices?: string[];

  /** Total patches applied across all slices */
  totalPatchesApplied: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract paths from a type as string literals.
 * Useful for type-safe path references.
 */
export type PathsOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? PathsOf<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

/**
 * Get the type at a specific path in an object.
 */
export type TypeAtPath<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? TypeAtPath<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;
