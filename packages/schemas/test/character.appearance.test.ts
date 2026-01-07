import { describe, test, expect } from 'vitest';
import { getDefaultAttribute, getRegionAttributes } from '../src/character/index.js';
import type { AppearanceRegion } from '../src/character/index.js';

describe('character/appearance', () => {
  test('getRegionAttributes returns configured attributes for each region', () => {
    const cases: { region: AppearanceRegion; expectedKeys: string[] }[] = [
      { region: 'overall', expectedKeys: ['height', 'build'] },
      { region: 'eyes', expectedKeys: ['color', 'shape'] },
      { region: 'leftHand', expectedKeys: ['size', 'description'] },
    ];

    for (const { region, expectedKeys } of cases) {
      const attributes = getRegionAttributes(region);
      expect(Object.keys(attributes)).toEqual(expectedKeys);
    }
  });

  test('getDefaultAttribute returns the first configured key', () => {
    const cases: { region: AppearanceRegion; expected: string }[] = [
      { region: 'overall', expected: 'height' },
      { region: 'skin', expected: 'tone' },
    ];

    for (const { region, expected } of cases) {
      expect(getDefaultAttribute(region)).toBe(expected);
    }
  });
});
