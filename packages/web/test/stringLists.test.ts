import { describe, it, expect } from 'vitest';
import { splitList } from '../src/features/shared/stringLists.js';

describe('splitList', () => {
  it('splits by commas and newlines', () => {
    const result = splitList('a, b\n c , ,d');
    expect(result).toEqual(['a', 'b', 'c', 'd']);
  });
});
