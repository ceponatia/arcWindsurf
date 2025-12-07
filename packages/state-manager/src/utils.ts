import { type JsonValue, type DeepPartial, type DiffResult } from './types.js';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a plain object (not array, null, or primitive).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a JSON-serializable value.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isPlainObject(value)) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

// ============================================================================
// Cloning
// ============================================================================

/**
 * Deep clone a JSON-serializable value.
 * Uses structured clone when available, falls back to JSON parse/stringify.
 */
export function deepClone<T>(value: T): T {
  // For primitives, return as-is
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Use JSON round-trip for deep clone (safe for JSON-serializable data)
  return JSON.parse(JSON.stringify(value)) as T;
}

// ============================================================================
// Deep Merge
// ============================================================================

/**
 * Deep merge two objects, with source values overriding target values.
 * Arrays are treated as atomic values and replaced wholesale.
 *
 * @param target The base object
 * @param source The object with override values
 * @param trackPaths Whether to track which paths were overridden
 * @returns The merged object and optionally the overridden paths
 */
export function deepMerge<T>(
  target: T,
  source: DeepPartial<T>,
  trackPaths = false
): { merged: T; overriddenPaths: string[] } {
  const overriddenPaths: string[] = [];

  function merge(t: unknown, s: unknown, path: string): unknown {
    // If source is undefined, keep target
    if (s === undefined) {
      return t;
    }

    // If source is not an object, or is an array, replace entirely
    if (!isPlainObject(s)) {
      if (trackPaths) {
        overriddenPaths.push(path);
      }
      return s;
    }

    // If target is not an object, replace with source
    if (!isPlainObject(t)) {
      if (trackPaths) {
        overriddenPaths.push(path);
      }
      return deepClone(s);
    }

    // Both are objects, merge recursively
    const result: Record<string, unknown> = { ...t };

    for (const key of Object.keys(s)) {
      const sourceValue = s[key];
      const targetValue = t[key];
      const newPath = path ? `${path}.${key}` : key;

      result[key] = merge(targetValue, sourceValue, newPath);
    }

    return result;
  }

  const merged = merge(deepClone(target), source, '') as T;
  return { merged, overriddenPaths };
}

// ============================================================================
// Deep Diff
// ============================================================================

/**
 * Compare two objects and compute the minimal diff.
 * Returns the portions of `modified` that differ from `original`.
 *
 * @param original The original/baseline object
 * @param modified The modified object
 * @returns The diff result with paths and minimal override object
 */
export function deepDiff<T>(original: T, modified: T): DiffResult<T> {
  const addedPaths: string[] = [];
  const removedPaths: string[] = [];
  const modifiedPaths: string[] = [];

  function diff(orig: unknown, mod: unknown, path: string): unknown {
    // If values are strictly equal, no diff
    if (orig === mod) {
      return undefined;
    }

    // Handle null cases
    if (orig === null || mod === null) {
      if (orig === null && mod !== null) {
        addedPaths.push(path);
      } else if (orig !== null && mod === null) {
        modifiedPaths.push(path);
      }
      return mod;
    }

    // If types differ, the whole value changed
    if (typeof orig !== typeof mod) {
      modifiedPaths.push(path);
      return mod;
    }

    // Handle arrays (treat as atomic)
    if (Array.isArray(orig) || Array.isArray(mod)) {
      if (!arraysEqual(orig, mod)) {
        modifiedPaths.push(path);
        return mod;
      }
      return undefined;
    }

    // Handle objects
    if (isPlainObject(orig) && isPlainObject(mod)) {
      const result: Record<string, unknown> = {};
      let hasChanges = false;

      // Check for modified and added keys
      for (const key of Object.keys(mod)) {
        const newPath = path ? `${path}.${key}` : key;
        const origValue = orig[key];
        const modValue = mod[key];

        if (!(key in orig)) {
          // Key was added
          addedPaths.push(newPath);
          result[key] = modValue;
          hasChanges = true;
        } else {
          // Key exists in both, recurse
          const keyDiff = diff(origValue, modValue, newPath);
          if (keyDiff !== undefined) {
            result[key] = keyDiff;
            hasChanges = true;
          }
        }
      }

      // Check for removed keys
      for (const key of Object.keys(orig)) {
        if (!(key in mod)) {
          const newPath = path ? `${path}.${key}` : key;
          removedPaths.push(newPath);
          // For removed keys, we could use a sentinel value or null
          // For now, we just track the path but don't include in diff
          // (JSON Patch would use a "remove" operation)
        }
      }

      return hasChanges ? result : undefined;
    }

    // Primitives that differ
    modifiedPaths.push(path);
    return mod;
  }

  const diffResult = diff(original, modified, '');
  const isIdentical = diffResult === undefined;

  return {
    diff: (diffResult ?? {}) as DeepPartial<T>,
    addedPaths,
    removedPaths,
    modifiedPaths,
    isIdentical,
  };
}

/**
 * Deep equality check for arrays.
 */
function arraysEqual(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!deepEqual(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Deep equality check for any JSON values.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return arraysEqual(a, b);
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get a value at a path in an object.
 */
export function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Set a value at a path in an object (mutates the object).
 */
export function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;

    if (!isPlainObject(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
}

/**
 * Extract paths from JSON Patch operations.
 */
export function extractPathsFromPatches(patches: { path: string }[]): string[] {
  return patches.map((p) => {
    // Remove leading slash and convert to dot notation
    return p.path.replace(/^\//, '').replace(/\//g, '.');
  });
}
