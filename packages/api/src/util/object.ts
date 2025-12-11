/**
 * Check if value is a plain object (not array, null, Date, etc.).
 */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

/**
 * Deep merge with array replacement semantics.
 *
 * When merging objects:
 * - Arrays in override completely replace arrays in base
 * - Objects are recursively merged
 * - Primitives in override replace primitives in base
 *
 * @param base - Base object to merge into
 * @param override - Override object to merge from
 * @returns Merged object
 */
export function deepMergeReplaceArrays<T>(base: T, override: unknown): T {
  if (!isPlainObject(override)) return base;

  const result = Array.isArray(base)
    ? [...(base as unknown[])]
    : { ...(base as Record<string, unknown>) };

  for (const [k, v] of Object.entries(override)) {
    const current = (result as Record<string, unknown>)[k];
    if (Array.isArray(v)) {
      // Arrays are replaced, not merged
      (result as Record<string, unknown>)[k] = v;
    } else if (isPlainObject(v) && isPlainObject(current)) {
      // Recursively merge objects
      (result as Record<string, unknown>)[k] = deepMergeReplaceArrays(current, v);
    } else {
      // Primitives replace
      (result as Record<string, unknown>)[k] = v;
    }
  }

  return result as T;
}
