import jsonPatch from 'fast-json-patch';
import type { Operation } from 'fast-json-patch';
import { type ZodSchema, type ZodError } from 'zod';
import {
  type StateManagerConfig,
  type StateMergeResult,
  type StatePatchResult,
  type MergeOptions,
  type PatchOptions,
  type DeepPartial,
  type DiffResult,
  type ValidationResult,
  type ValidationError,
  type FailedPatch,
  type StateSlice,
  type StatePatches,
  type SliceState,
  type MultiSlicePatchResult,
  DEFAULT_STATE_MANAGER_CONFIG,
} from './types.js';
import { deepMerge, deepDiff, deepClone, extractPathsFromPatches } from './utils.js';

/**
 * StateManager handles the merging of baseline state with overrides,
 * and the application of JSON Patch operations.
 *
 * It supports a slice registry pattern for extensibility - new state categories
 * (proximity, inventory, dialogue) can be added without modifying the core manager.
 *
 * It is a pure in-memory utility with no database or network dependencies.
 * Higher layers are responsible for loading/persisting state.
 */
export class StateManager {
  private readonly config: Required<StateManagerConfig>;
  private readonly slices = new Map<string, StateSlice<unknown>>();

  constructor(config: StateManagerConfig = {}) {
    this.config = { ...DEFAULT_STATE_MANAGER_CONFIG, ...config };
  }

  // ==========================================================================
  // Slice Registry
  // ==========================================================================

  /**
   * Register a state slice with its schema and configuration.
   * Slices enable extensible state categories without core manager changes.
   *
   * @param slice The slice definition including key, schema, and default state
   * @throws Error if a slice with the same key is already registered
   */
  registerSlice<T>(slice: StateSlice<T>): void {
    if (this.slices.has(slice.key)) {
      throw new SliceRegistrationError(
        `Slice '${slice.key}' is already registered. Use unregisterSlice() first to replace it.`
      );
    }

    if (slice.mergeStrategy === 'custom' && !slice.customMerge) {
      throw new SliceRegistrationError(
        `Slice '${slice.key}' has mergeStrategy 'custom' but no customMerge function provided.`
      );
    }

    this.slices.set(slice.key, slice as StateSlice<unknown>);
  }

  /**
   * Unregister a previously registered slice.
   *
   * @param key The slice key to unregister
   * @returns true if the slice was removed, false if it wasn't registered
   */
  unregisterSlice(key: string): boolean {
    return this.slices.delete(key);
  }

  /**
   * Check if a slice is registered.
   *
   * @param key The slice key to check
   * @returns true if the slice is registered
   */
  hasSlice(key: string): boolean {
    return this.slices.has(key);
  }

  /**
   * Get a registered slice by key.
   *
   * @param key The slice key
   * @returns The slice definition or undefined if not registered
   */
  getSlice<T>(key: string): StateSlice<T> | undefined {
    return this.slices.get(key) as StateSlice<T> | undefined;
  }

  /**
   * Get all registered slice keys.
   *
   * @returns Array of registered slice keys
   */
  getRegisteredSliceKeys(): string[] {
    return Array.from(this.slices.keys());
  }

  // ==========================================================================
  // Core State Operations
  // ==========================================================================

  /**
   * Compute the effective state by merging baseline with overrides.
   *
   * @param baseline The immutable base state (e.g., template snapshot)
   * @param overrides Per-session overrides to apply on top of baseline
   * @param options Optional merge options including schema validation
   * @returns The merged effective state
   */
  getEffectiveState<T>(
    baseline: T,
    overrides: DeepPartial<T>,
    options: MergeOptions<T> = {}
  ): StateMergeResult<T> {
    const { schema, cloneBaseline = true } = options;

    // Clone baseline if requested to prevent mutation
    const base = cloneBaseline ? deepClone(baseline) : baseline;

    // Perform deep merge
    const { merged, overriddenPaths } = deepMerge(base, overrides, true);

    // Validate if schema provided and validation enabled
    if (schema && this.config.validateOnMerge) {
      const validationResult = this.validate(merged, schema);
      if (!validationResult.success) {
        throw new StateValidationError(
          'Merged state failed validation',
          validationResult.errors ?? []
        );
      }
    }

    return {
      effective: merged,
      overriddenPaths,
    };
  }

  /**
   * Apply JSON Patch operations and compute new overrides.
   *
   * The patches are applied to the effective state (baseline + current overrides),
   * then the result is diffed against the baseline to compute minimal new overrides.
   *
   * @param baseline The immutable base state
   * @param overrides Current per-session overrides
   * @param patches JSON Patch operations to apply
   * @param options Optional patch options
   * @returns The new overrides and metadata about the operation
   */
  applyPatches<T>(
    baseline: T,
    overrides: DeepPartial<T>,
    patches: Operation[],
    options: PatchOptions<T> = {}
  ): StatePatchResult<T> {
    const {
      schema,
      computeMinimalDiff = this.config.computeMinimalDiff,
      validatePatches = this.config.validatePatches,
      allowPartialFailure = false,
    } = options;

    // 1. Compute current effective state
    const { effective } = this.getEffectiveState(baseline, overrides);

    // 2. Clone effective state for mutation
    const nextState = deepClone(effective);

    // 3. Validate patches if requested
    if (validatePatches) {
      const patchErrors = jsonPatch.validate(patches, nextState);
      if (patchErrors) {
        throw new PatchValidationError('Invalid patch operations', patchErrors.message);
      }
    }

    // 4. Apply patches
    const failedPatches: FailedPatch[] = [];
    let patchesApplied = 0;

    if (allowPartialFailure) {
      // Apply patches one by one, collecting failures
      for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];
        if (!patch) continue;

        try {
          // applyPatch params: document, patch, validateOperation, mutateDocument, banPrototypeModifications
          jsonPatch.applyPatch(nextState, [patch], true, true);
          patchesApplied++;
        } catch (error) {
          failedPatches.push({
            operation: patch,
            index: i,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else {
      // Apply all patches at once (will throw on first error)
      // applyPatch params: document, patch, validateOperation, mutateDocument, banPrototypeModifications
      jsonPatch.applyPatch(nextState, patches, true, true);
      patchesApplied = patches.length;
    }

    // 5. Validate result if schema provided
    if (schema) {
      const validationResult = this.validate(nextState, schema);
      if (!validationResult.success) {
        throw new StateValidationError(
          'Patched state failed validation',
          validationResult.errors ?? []
        );
      }
    }

    // 6. Compute new overrides
    let newOverrides: DeepPartial<T>;
    let modifiedPaths: string[];

    if (computeMinimalDiff) {
      // Diff against baseline to get minimal overrides
      const diffResult = this.diff(baseline, nextState);
      newOverrides = diffResult.diff;
      modifiedPaths = [...diffResult.addedPaths, ...diffResult.modifiedPaths];
    } else {
      // Return full state as overrides (less efficient)
      newOverrides = nextState as DeepPartial<T>;
      modifiedPaths = extractPathsFromPatches(patches);
    }

    // Build result, only including failedPatches if there are any
    // (exactOptionalPropertyTypes disallows assigning undefined to optional props)
    const result: StatePatchResult<T> = {
      newOverrides,
      newEffective: nextState,
      modifiedPaths,
      patchesApplied,
    };

    if (failedPatches.length > 0) {
      result.failedPatches = failedPatches;
    }

    return result;
  }

  /**
   * Compute the diff between two states.
   *
   * @param original The original/baseline state
   * @param modified The modified state
   * @returns The diff result with paths and minimal diff object
   */
  diff<T>(original: T, modified: T): DiffResult<T> {
    return deepDiff(original, modified);
  }

  /**
   * Validate a state object against a Zod schema.
   *
   * @param state The state to validate
   * @param schema The Zod schema to validate against
   * @returns The validation result
   */
  validate<T>(state: unknown, schema: ZodSchema<T>): ValidationResult<T> {
    const result = schema.safeParse(state);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    return {
      success: false,
      errors: this.formatZodErrors(result.error),
    };
  }

  // ==========================================================================
  // Slice-Aware Operations
  // ==========================================================================

  /**
   * Get effective state for a registered slice.
   * Uses the slice's configured merge strategy and schema for validation.
   *
   * @param sliceKey The registered slice key
   * @param baseline The baseline state (uses slice default if not provided)
   * @param overrides Overrides to merge
   * @returns The effective state for this slice
   * @throws SliceNotFoundError if the slice is not registered
   */
  getEffectiveStateForSlice<T>(
    sliceKey: string,
    baseline?: T,
    overrides: DeepPartial<T> = {} as DeepPartial<T>
  ): StateMergeResult<T> {
    const slice = this.slices.get(sliceKey);
    if (!slice) {
      throw new SliceNotFoundError(`Slice '${sliceKey}' is not registered.`);
    }

    const base = (baseline ?? slice.defaultState) as T;
    const mergeStrategy = slice.mergeStrategy ?? 'deep';

    // Handle different merge strategies
    if (mergeStrategy === 'replace') {
      // Replace strategy: overrides completely replace baseline if any overrides exist
      const hasOverrides = Object.keys(overrides as object).length > 0;
      const effective = hasOverrides ? { ...base, ...overrides } : deepClone(base);
      return {
        effective,
        overriddenPaths: hasOverrides ? Object.keys(overrides as object) : [],
      };
    }

    if (mergeStrategy === 'custom' && slice.customMerge) {
      // Custom merge: delegate to the slice's custom merge function
      const effective = slice.customMerge(base, overrides as DeepPartial<unknown>) as T;
      return {
        effective,
        overriddenPaths: [], // Custom merge doesn't track paths
      };
    }

    // Default: deep merge
    const mergeOptions: MergeOptions<T> = {};
    if (this.config.validateOnMerge) {
      mergeOptions.schema = slice.schema as ZodSchema<T>;
    }
    return this.getEffectiveState(base, overrides, mergeOptions);
  }

  /**
   * Apply patches to a registered slice.
   * Uses the slice's schema for validation if configured.
   *
   * @param sliceKey The registered slice key
   * @param baseline The baseline state (uses slice default if not provided)
   * @param overrides Current overrides
   * @param patches JSON Patch operations to apply
   * @param options Optional patch options
   * @returns The patch result with new overrides
   * @throws SliceNotFoundError if the slice is not registered
   */
  applyPatchesToSlice<T>(
    sliceKey: string,
    baseline: T | undefined,
    overrides: DeepPartial<T>,
    patches: Operation[],
    options: Omit<PatchOptions<T>, 'schema'> = {}
  ): StatePatchResult<T> {
    const slice = this.slices.get(sliceKey);
    if (!slice) {
      throw new SliceNotFoundError(`Slice '${sliceKey}' is not registered.`);
    }

    const base = (baseline ?? slice.defaultState) as T;

    return this.applyPatches(base, overrides, patches, {
      ...options,
      schema: slice.schema as ZodSchema<T>,
    });
  }

  /**
   * Apply patches to multiple slices in a single operation.
   * This is the primary method for processing tool results that affect multiple state slices.
   *
   * @param sliceStates Map of slice keys to their current baseline and overrides
   * @param patches StatePatches object with patches keyed by slice name
   * @param options Optional patch options (applied to all slices)
   * @returns Results for each slice and overall success status
   */
  applyMultiSlicePatches(
    sliceStates: Record<string, SliceState<unknown>>,
    patches: StatePatches,
    options: Omit<PatchOptions<unknown>, 'schema'> = {}
  ): MultiSlicePatchResult {
    const results: Record<string, StatePatchResult<unknown>> = {};
    const failedSlices: string[] = [];
    let totalPatchesApplied = 0;

    // Process each slice that has patches
    for (const [sliceKey, slicePatches] of Object.entries(patches)) {
      // Skip if no patches for this slice
      if (!slicePatches || slicePatches.length === 0) {
        continue;
      }

      const sliceState = sliceStates[sliceKey];
      const slice = this.slices.get(sliceKey);

      // If slice isn't in sliceStates, use the registered default
      const baseline = sliceState.baseline ?? slice?.defaultState ?? {};
      const overrides = sliceState.overrides ?? {};

      try {
        // Use slice-aware method if registered, otherwise use generic applyPatches
        if (slice) {
          results[sliceKey] = this.applyPatchesToSlice(
            sliceKey,
            baseline,
            overrides,
            slicePatches,
            options
          );
        } else {
          // Unregistered slice - apply patches without schema validation
          results[sliceKey] = this.applyPatches(baseline, overrides, slicePatches, options);
        }
        totalPatchesApplied += results[sliceKey]?.patchesApplied ?? 0;
      } catch (error) {
        // Track failure but continue with other slices
        failedSlices.push(sliceKey);
        results[sliceKey] = {
          newOverrides: overrides,
          newEffective: baseline,
          modifiedPaths: [],
          patchesApplied: 0,
          failedPatches: slicePatches.map((op, index) => ({
            operation: op,
            index,
            error: error instanceof Error ? error.message : String(error),
          })),
        };
      }
    }

    const result: MultiSlicePatchResult = {
      results,
      allSucceeded: failedSlices.length === 0,
      totalPatchesApplied,
    };

    if (failedSlices.length > 0) {
      result.failedSlices = failedSlices;
    }

    return result;
  }

  /**
   * Validate state for a registered slice against its schema.
   *
   * @param sliceKey The registered slice key
   * @param state The state to validate
   * @returns The validation result
   * @throws SliceNotFoundError if the slice is not registered
   */
  validateSlice<T>(sliceKey: string, state: unknown): ValidationResult<T> {
    const slice = this.slices.get(sliceKey);
    if (!slice) {
      throw new SliceNotFoundError(`Slice '${sliceKey}' is not registered.`);
    }

    return this.validate(state, slice.schema as ZodSchema<T>);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Format Zod errors into our ValidationError format.
   */
  private formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
      value: undefined, // Zod doesn't include the value in error details
    }));
  }
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when state validation fails.
 */
export class StateValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[]
  ) {
    super(message);
    this.name = 'StateValidationError';
  }
}

/**
 * Error thrown when patch validation fails.
 */
export class PatchValidationError extends Error {
  constructor(
    message: string,
    public readonly details: string
  ) {
    super(`${message}: ${details}`);
    this.name = 'PatchValidationError';
  }
}

/**
 * Error thrown when a slice is not found in the registry.
 */
export class SliceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SliceNotFoundError';
  }
}

/**
 * Error thrown when slice registration fails.
 */
export class SliceRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SliceRegistrationError';
  }
}
