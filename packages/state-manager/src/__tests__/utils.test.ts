import { describe, it, expect } from 'vitest';
import {
  deepMerge,
  deepDiff,
  deepClone,
  deepEqual,
  isPlainObject,
  isJsonValue,
  getAtPath,
  setAtPath,
  extractPathsFromPatches,
} from '../utils.js';

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject({ nested: { value: true } })).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(123)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});

describe('isJsonValue', () => {
  it('returns true for valid JSON values', () => {
    expect(isJsonValue(null)).toBe(true);
    expect(isJsonValue('string')).toBe(true);
    expect(isJsonValue(123)).toBe(true);
    expect(isJsonValue(true)).toBe(true);
    expect(isJsonValue([])).toBe(true);
    expect(isJsonValue([1, 'two', null])).toBe(true);
    expect(isJsonValue({})).toBe(true);
    expect(isJsonValue({ a: 1, b: 'two' })).toBe(true);
  });

  it('returns false for functions', () => {
    expect(isJsonValue(() => undefined)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isJsonValue(undefined)).toBe(false);
  });
});

describe('deepClone', () => {
  it('clones primitives', () => {
    expect(deepClone('string')).toBe('string');
    expect(deepClone(123)).toBe(123);
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('clones arrays', () => {
    const original = [1, 2, { a: 3 }];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[2]).not.toBe(original[2]);
  });

  it('clones objects', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
  });
});

describe('deepMerge', () => {
  it('merges flat objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const { merged } = deepMerge(target, source);
    expect(merged).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('merges nested objects', () => {
    const target = { a: { x: 1, y: 2 }, b: 3 };
    const source = { a: { y: 20, z: 30 } };
    const { merged } = deepMerge(target, source);
    expect(merged).toEqual({ a: { x: 1, y: 20, z: 30 }, b: 3 });
  });

  it('replaces arrays instead of merging', () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };
    const { merged } = deepMerge(target, source);
    expect(merged).toEqual({ arr: [4, 5] });
  });

  it('tracks overridden paths when requested', () => {
    const target = { a: 1, b: { c: 2, d: 0 } };
    const source = { a: 10, b: { d: 4 } };
    const { merged, overriddenPaths } = deepMerge(target, source, true);
    expect(merged).toEqual({ a: 10, b: { c: 2, d: 4 } });
    expect(overriddenPaths).toContain('a');
    expect(overriddenPaths).toContain('b.d');
  });

  it('does not mutate the target', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { c: 20 } };
    deepMerge(target, source);
    expect(target.b.c).toBe(2);
  });

  it('handles null values in source', () => {
    const target = { a: 1, b: { c: 2 } };
    const source: { b: null } = { b: null };
    const { merged } = deepMerge(target, source as unknown as typeof target);
    expect(merged).toEqual({ a: 1, b: null });
  });
});

describe('deepDiff', () => {
  it('returns empty diff for identical objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const result = deepDiff(obj, obj);
    expect(result.isIdentical).toBe(true);
    expect(result.diff).toEqual({});
  });

  it('detects added paths', () => {
    const original = { a: 1 };
    const modified = { a: 1, b: 2 };
    const result = deepDiff(original, modified);
    expect(result.addedPaths).toContain('b');
    expect(result.diff).toEqual({ b: 2 });
  });

  it('detects removed paths', () => {
    const original = { a: 1, b: 2 };
    const modified = { a: 1 };
    const result = deepDiff(original, modified);
    expect(result.removedPaths).toContain('b');
  });

  it('detects modified paths', () => {
    const original = { a: 1, b: 2 };
    const modified = { a: 1, b: 20 };
    const result = deepDiff(original, modified);
    expect(result.modifiedPaths).toContain('b');
    expect(result.diff).toEqual({ b: 20 });
  });

  it('handles nested changes', () => {
    const original = { a: { b: { c: 1 } } };
    const modified = { a: { b: { c: 2 } } };
    const result = deepDiff(original, modified);
    expect(result.modifiedPaths).toContain('a.b.c');
    expect(result.diff).toEqual({ a: { b: { c: 2 } } });
  });

  it('treats arrays as atomic', () => {
    const original = { arr: [1, 2, 3] };
    const modified = { arr: [1, 2, 3, 4] };
    const result = deepDiff(original, modified);
    expect(result.modifiedPaths).toContain('arr');
    expect(result.diff).toEqual({ arr: [1, 2, 3, 4] });
  });
});

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
  });

  it('compares arrays', () => {
    expect(deepEqual([1, 2], [1, 2])).toBe(true);
    expect(deepEqual([1, 2], [1, 3])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('compares objects', () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('compares nested structures', () => {
    const a = { x: { y: [1, { z: 2 }] } };
    const b = { x: { y: [1, { z: 2 }] } };
    const c = { x: { y: [1, { z: 3 }] } };
    expect(deepEqual(a, b)).toBe(true);
    expect(deepEqual(a, c)).toBe(false);
  });
});

describe('getAtPath', () => {
  it('gets values at paths', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getAtPath(obj, 'a.b.c')).toBe(42);
    expect(getAtPath(obj, 'a.b')).toEqual({ c: 42 });
    expect(getAtPath(obj, 'a')).toEqual({ b: { c: 42 } });
  });

  it('returns undefined for missing paths', () => {
    const obj = { a: 1 };
    expect(getAtPath(obj, 'b')).toBeUndefined();
    expect(getAtPath(obj, 'a.b.c')).toBeUndefined();
  });

  it('returns the object for empty path', () => {
    const obj = { a: 1 };
    expect(getAtPath(obj, '')).toEqual(obj);
  });
});

describe('setAtPath', () => {
  it('sets values at paths', () => {
    const obj: Record<string, unknown> = { a: { b: 1 } };
    setAtPath(obj, 'a.b', 2);
    expect(obj['a']).toEqual({ b: 2 });
  });

  it('creates intermediate objects', () => {
    const obj: Record<string, unknown> = {};
    setAtPath(obj, 'a.b.c', 42);
    expect(obj).toEqual({ a: { b: { c: 42 } } });
  });
});

describe('extractPathsFromPatches', () => {
  it('extracts paths from JSON Patch operations', () => {
    const patches = [
      { op: 'replace', path: '/a/b/c', value: 1 },
      { op: 'add', path: '/x/y', value: 2 },
    ];
    const paths = extractPathsFromPatches(patches);
    expect(paths).toEqual(['a.b.c', 'x.y']);
  });
});
