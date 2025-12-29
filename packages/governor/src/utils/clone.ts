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

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    const baseMessage =
      'cloneJsonLike: Failed to clone value. Ensure the value is JSON-serializable and contains no circular references.';
    if (error instanceof Error && error.message) {
      throw new Error(`${baseMessage} Original error: ${error.message}`);
    }
    throw new Error(baseMessage);
  }
}
