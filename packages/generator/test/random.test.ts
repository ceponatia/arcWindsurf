import {
  pickFromPool,
  pickMultiple,
  pickRandom,
  pickRandomCount,
  pickWeighted,
  randomBool,
  randomFloat,
  randomFloatRounded,
  randomId,
  randomInt,
  shuffle,
} from '../src/index.js';

import { afterEach, describe, expect, test, vi } from 'vitest';

describe('generator/random exports', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('pickRandom throws for empty array', () => {
    expect(() => pickRandom([])).toThrow('Cannot pick from empty array');
  });

  test('pickRandom uses Math.random index (table-driven)', () => {
    const items = ['a', 'b', 'c'] as const;

    const cases: { random: number; expected: (typeof items)[number] }[] = [
      { random: 0, expected: 'a' },
      { random: 0.34, expected: 'b' },
      { random: 0.9999, expected: 'c' },
    ];

    for (const c of cases) {
      vi.spyOn(Math, 'random').mockReturnValueOnce(c.random);
      expect(pickRandom(items)).toBe(c.expected);
    }
  });

  test('pickWeighted throws for empty pool', () => {
    expect(() => pickWeighted([])).toThrow('Cannot pick from empty weighted pool');
  });

  test('pickWeighted respects weights (table-driven)', () => {
    const pool = [
      { value: 'low', weight: 1 },
      { value: 'mid', weight: 2 },
      { value: 'high', weight: 7 },
    ] as const;

    // totalWeight=10; random is Math.random()*10
    const cases: { random: number; expected: (typeof pool)[number]['value'] }[] = [
      { random: 0.0, expected: 'low' }, // 0
      { random: 0.19, expected: 'mid' }, // 1.9 -> after low (<=0) not hit, after mid hit
      { random: 0.99, expected: 'high' }, // 9.9 -> lands in high
    ];

    for (const c of cases) {
      vi.spyOn(Math, 'random').mockReturnValueOnce(c.random);
      expect(pickWeighted(pool)).toBe(c.expected);
    }
  });

  test('pickFromPool handles both simple and weighted pools', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9999);
    expect(pickFromPool(['x', 'y', 'z'] as const)).toBe('z');

    vi.spyOn(Math, 'random').mockReturnValueOnce(0.0);
    expect(
      pickFromPool([
        { value: 'a', weight: 1 },
        { value: 'b', weight: 1 },
      ] as const)
    ).toBe('a');
  });

  test('pickMultiple returns unique items and preserves all when count >= length', () => {
    const cases = [
      { items: [1, 2, 3], count: 0, expectedLength: 0 },
      { items: [1, 2, 3], count: 1, expectedLength: 1 },
      { items: [1, 2, 3], count: 2, expectedLength: 2 },
      { items: [1, 2, 3], count: 3, expectedLength: 3 },
      { items: [1, 2, 3], count: 99, expectedLength: 3 },
    ];

    for (const c of cases) {
      const result = pickMultiple(c.items, c.count);
      expect(result).toHaveLength(c.expectedLength);
      expect(new Set(result).size).toBe(result.length);
      for (const v of result) expect(c.items).toContain(v);
    }
  });

  test('pickRandomCount returns between min and max inclusive', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    const cases = [
      { random: 0.0, min: 2, max: 4, expectedLen: 2 },
      { random: 0.9999, min: 2, max: 4, expectedLen: 4 },
    ];

    for (const c of cases) {
      vi.spyOn(Math, 'random').mockReturnValueOnce(c.random);
      const picked = pickRandomCount(items, c.min, c.max);
      expect(picked.length).toBe(c.expectedLen);
      expect(new Set(picked).size).toBe(picked.length);
    }
  });

  test('randomInt is inclusive and honors bounds', () => {
    const cases = [
      { random: 0.0, min: 2, max: 4, expected: 2 },
      { random: 0.9999, min: 2, max: 4, expected: 4 },
    ];

    for (const c of cases) {
      vi.spyOn(Math, 'random').mockReturnValueOnce(c.random);
      expect(randomInt(c.min, c.max)).toBe(c.expected);
    }
  });

  test('randomFloat stays within [min, max)', () => {
    const cases = [
      { random: 0.0, min: 10, max: 20, expected: 10 },
      { random: 0.5, min: 10, max: 20, expected: 15 },
    ];

    for (const c of cases) {
      vi.spyOn(Math, 'random').mockReturnValueOnce(c.random);
      const value = randomFloat(c.min, c.max);
      expect(value).toBe(c.expected);
      expect(value).toBeGreaterThanOrEqual(c.min);
      expect(value).toBeLessThan(c.max);
    }
  });

  test('randomFloatRounded rounds to requested decimals', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456);
    expect(randomFloatRounded(0, 1, 2)).toBe(0.12);

    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456);
    expect(randomFloatRounded(0, 1, 3)).toBe(0.123);
  });

  test('randomBool respects probabilityTrue (table-driven)', () => {
    const cases = [
      { random: 0.0, p: 0.0, expected: false },
      { random: 0.0, p: 1.0, expected: true },
      { random: 0.49, p: 0.5, expected: true },
      { random: 0.5, p: 0.5, expected: false },
    ];

    for (const c of cases) {
      vi.spyOn(Math, 'random').mockReturnValueOnce(c.random);
      expect(randomBool(c.p)).toBe(c.expected);
    }
  });

  test('randomId uses prefix and includes timestamp/random parts', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456);

    const id = randomId('char');
    expect(id).toMatch(/^char-[a-z0-9]+-[a-z0-9]{6}$/);

    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456);

    const noPrefix = randomId();
    expect(noPrefix).toMatch(/^[a-z0-9]+-[a-z0-9]{6}$/);
    expect(noPrefix.includes('char-')).toBe(false);
  });

  test('shuffle preserves members and length', () => {
    // deterministic-ish shuffle check: verify it stays a permutation
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];

    const shuffled = shuffle(copy);
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort((a, b) => a - b)).toEqual([...original].sort((a, b) => a - b));
  });
});
