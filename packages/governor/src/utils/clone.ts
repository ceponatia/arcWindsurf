/**
 * Safely deep-clone JSON-like data.
 *
 * Prefers `structuredClone` when available; falls back to JSON stringify/parse.
 *
 * Intended for cloning turn snapshots (state slices, tool args) to avoid shared
 * mutation across parallel execution.
 */
export function cloneJsonLike<T>(value: T): T {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // fall through to JSON clone
  }

  return JSON.parse(JSON.stringify(value)) as T;
}
