import { applyPatch, type Operation } from 'fast-json-patch';
import { type StateMergeResult, type StatePatchResult } from './types.js';

// Simple deep merge helper (or use lodash.merge if added)
function deepMerge<T>(target: T, source: Partial<T>): T {
  // This is a naive implementation for scaffolding.
  // In production, use a robust library like deepmerge or lodash.merge
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const k = key as keyof T;
      if (isObject(source[k])) {
        if (!(k in target)) {
          Object.assign(output, { [k]: source[k] });
        } else {
          output[k] = deepMerge(target[k], source[k]);
        }
      } else {
        Object.assign(output, { [k]: source[k] });
      }
    });
  }
  return output;
}

function isObject(item: unknown): item is object {
  return !!(item && typeof item === 'object' && !Array.isArray(item));
}

export class StateManager {
  /**
   * Computes the effective state by merging baseline and overrides.
   */
  getEffectiveState<T>(baseline: T, overrides: Partial<T>): StateMergeResult<T> {
    // In a real implementation, we might want to clone baseline first to avoid mutation
    // For now, we assume baseline is immutable JSON
    const effective = deepMerge(baseline, overrides);
    return { effective };
  }

  /**
   * Applies JSON patches to the overrides object to generate a new overrides object.
   * Note: We apply patches to the *overrides*, not the effective state,
   * because we only persist the diffs.
   *
   * However, sometimes the agent sees the *effective* state and generates a patch for that.
   * If the patch is against effective state, we might need to calculate the diff.
   *
   * For this scaffold, we assume the agent generates patches intended for the overrides layer
   * OR we apply the patch to a clone of effective state and then diff it against baseline?
   *
   * Simpler approach for v1:
   * The agent generates patches. We apply them to the *current overrides*.
   * If a path doesn't exist in overrides (because it's still baseline),
   * we might need to copy it from baseline to overrides first?
   *
   * Actually, standard JSON Patch might fail if the path doesn't exist.
   *
   * Alternative:
   * 1. Construct Effective State (Baseline + Overrides).
   * 2. Apply Patch to Effective State -> New Effective State.
   * 3. Diff (New Effective State, Baseline) -> New Overrides.
   *
   * This "Diff" approach is robust but requires a diffing library.
   *
   * For now, let's just scaffold the method signature.
   */
  applyPatches<T>(baseline: T, overrides: Partial<T>, patches: Operation[]): StatePatchResult<T> {
    // 1. Construct effective
    const { effective } = this.getEffectiveState(baseline, overrides);

    // 2. Clone effective to avoid mutation
    const nextState = JSON.parse(JSON.stringify(effective)) as T;

    // 3. Apply patch
    // fast-json-patch mutates the document
    applyPatch(nextState, patches);

    // 4. Calculate new overrides (Diff)
    // For this scaffold, we'll just return the whole nextState as overrides
    // (which is inefficient but correct-ish for a scaffold).
    // TODO: Implement proper diffing to keep overrides minimal.

    return { newOverrides: nextState };
  }
}
