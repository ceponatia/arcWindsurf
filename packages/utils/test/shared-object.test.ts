import { describe, it, expect } from 'vitest';
import { isPlainObject, deepMergeReplaceArrays, deepClone, deepDiff } from '../src/shared/object.js';


describe('shared object', () => {
  it('detects plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
  });

  it('deep merges with array replacement', () => {
    const result = deepMergeReplaceArrays({ a: [1], b: { c: 1 } }, { a: [2], b: { d: 2 } });
    expect(result).toEqual({ a: [2], b: { c: 1, d: 2 } });
  });

  it('deep clones and diffs', () => {
    const value = { a: 1, b: { c: 2 } };
    const clone = deepClone(value);
    expect(clone).toEqual(value);

    const diff = deepDiff(value, { a: 1, b: { c: 3 } });
    expect(diff.isIdentical).toBe(false);
    expect(diff.modifiedPaths).toContain('b.c');
  });
});
