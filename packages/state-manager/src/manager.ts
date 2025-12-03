import { applyPatch, type Operation, validate } from 'fast-json-patch';
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
  DEFAULT_STATE_MANAGER_CONFIG,
} from './types.js';
import { deepMerge, deepDiff, deepClone, extractPathsFromPatches } from './utils.js';

/**
 * StateManager handles the merging of baseline state with overrides,
 * and the application of JSON Patch operations.
 *
 * It is a pure in-memory utility with no database or network dependencies.
 * Higher layers are responsible for loading/persisting state.
 */
export class StateManager {
  private readonly config: Required<StateManagerConfig>;

  constructor(config: StateManagerConfig = {}) {
    this.config = { ...DEFAULT_STATE_MANAGER_CONFIG, ...config };
  }

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
      const patchErrors = validate(patches, nextState);
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
          applyPatch(nextState, [patch], true, true);
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
      applyPatch(nextState, patches, true, true);
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
