import { describe, it, expect, vi, afterEach } from 'vitest';
import { pickMultipleFromPool, pickRandomCountFromPool } from '../src/index.js';

describe('generator/random advanced', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pickMultipleFromPool handles weighted pools and uniqueness', () => {
    const pool = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 1 },
      { value: 'c', weight: 1 },
    ] as const;

    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = pickMultipleFromPool(pool, 2);

    expect(result).toEqual(['a', 'b']);
  });

  it('pickMultipleFromPool returns all values when count exceeds length', () => {
    const pool = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 1 },
    ] as const;

    const result = pickMultipleFromPool(pool, 5);

    expect(result).toEqual(['a', 'b']);
  });

  it('pickRandomCountFromPool uses random count bounds', () => {
    const pool = ['a', 'b', 'c', 'd'];

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const minCount = pickRandomCountFromPool(pool, 1, 3);
    expect(minCount).toHaveLength(1);

    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const maxCount = pickRandomCountFromPool(pool, 1, 3);
    expect(maxCount).toHaveLength(3);
  });
});
