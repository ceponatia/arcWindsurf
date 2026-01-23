import { describe, it, expect } from 'vitest';
import { extractPathsFromPatches } from '../src/shared/object.js';


describe('extractPathsFromPatches', () => {
  it('collects patch paths', () => {
    const result = extractPathsFromPatches([
      { op: 'replace', path: '/a' },
      { op: 'add', path: '/b' },
    ]);
    expect(result).toEqual(['a', 'b']);
  });
});
