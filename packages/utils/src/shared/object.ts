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

/**
 * Deep clone a JSON-serializable value.
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Compare two objects and compute the minimal diff.
 */
export function deepDiff<T>(
  original: T,
  modified: T
): {
  diff: any;
  addedPaths: string[];
  removedPaths: string[];
  modifiedPaths: string[];
  isIdentical: boolean;
} {
  const addedPaths: string[] = [];
  const removedPaths: string[] = [];
  const modifiedPaths: string[] = [];

  function diff(orig: unknown, mod: unknown, path: string): unknown {
    if (orig === mod) return undefined;
    if (orig === null || mod === null || typeof orig !== typeof mod) {
      if (orig === null && mod !== null) addedPaths.push(path);
      else modifiedPaths.push(path);
      return mod;
    }
    if (Array.isArray(orig) || Array.isArray(mod)) {
      if (JSON.stringify(orig) !== JSON.stringify(mod)) {
        modifiedPaths.push(path);
        return mod;
      }
      return undefined;
    }
    if (isPlainObject(orig) && isPlainObject(mod)) {
      const result: Record<string, unknown> = {};
      let hasChanges = false;
      for (const key of Object.keys(mod)) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in orig)) {
          addedPaths.push(newPath);
          result[key] = mod[key];
          hasChanges = true;
        } else {
          const keyDiff = diff(orig[key], mod[key], newPath);
          if (keyDiff !== undefined) {
            result[key] = keyDiff;
            hasChanges = true;
          }
        }
      }
      for (const key of Object.keys(orig)) {
        if (!(key in mod)) removedPaths.push(path ? `${path}.${key}` : key);
      }
      return hasChanges ? result : undefined;
    }
    modifiedPaths.push(path);
    return mod;
  }

  const diffResult = diff(original, modified, '');
  return {
    diff: diffResult ?? {},
    addedPaths,
    removedPaths,
    modifiedPaths,
    isIdentical: diffResult === undefined,
  };
}

/**
 * Extracts a unique list of paths from an array of JSON patches.
 *
 * @param patches - Array of JSON patch operations
 * @returns Array of unique paths modified by the patches
 */
export function extractPathsFromPatches(patches: any[]): string[] {
  const paths = new Set<string>();
  for (const patch of patches) {
    if (patch.path) {
      // Remove leading slash and convert to dot notation for consistency if needed,
      // but usually we just want the segments.
      const normalized = patch.path.startsWith('/') ? patch.path.slice(1) : patch.path;
      paths.add(normalized.replace(/\//g, '.'));
    }
  }
  return Array.from(paths);
}
