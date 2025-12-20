import {
  filterRegionsByGender,
  getAppearanceRegionsForGender,
  getBodyRegionsForGender,
  isAppearanceRegionForGender,
  isRegionForGender,
} from '../src/index.js';

import { describe, expect, test } from 'vitest';

describe('generator/character filter exports', () => {
  test('getBodyRegionsForGender includes appropriate gender-specific regions', () => {
    const female = getBodyRegionsForGender('female');
    const male = getBodyRegionsForGender('male');
    const none = getBodyRegionsForGender(undefined);

    expect(female).toContain('vagina');
    expect(female).not.toContain('penis');

    expect(male).toContain('penis');
    expect(male).not.toContain('vagina');

    // when gender is unspecified, should return only neutral regions
    expect(none).not.toContain('vagina');
    expect(none).not.toContain('penis');
  });

  test('getAppearanceRegionsForGender includes appropriate gender-specific regions', () => {
    const female = getAppearanceRegionsForGender('female');
    const male = getAppearanceRegionsForGender('male');
    const none = getAppearanceRegionsForGender(undefined);

    expect(female).toContain('vagina');
    expect(female).not.toContain('penis');

    expect(male).toContain('penis');
    expect(male).not.toContain('vagina');

    expect(none).not.toContain('vagina');
    expect(none).not.toContain('penis');
  });

  test('isRegionForGender / isAppearanceRegionForGender reflect region lists', () => {
    const cases = [
      {
        gender: 'female' as const,
        bodyRegion: 'vagina' as const,
        appearanceRegion: 'vagina' as const,
        expected: true,
      },
      {
        gender: 'male' as const,
        bodyRegion: 'vagina' as const,
        appearanceRegion: 'vagina' as const,
        expected: false,
      },
      {
        gender: undefined,
        bodyRegion: 'vagina' as const,
        appearanceRegion: 'vagina' as const,
        expected: false,
      },
    ];

    for (const c of cases) {
      expect(isRegionForGender(c.bodyRegion, c.gender)).toBe(c.expected);
      expect(isAppearanceRegionForGender(c.appearanceRegion, c.gender)).toBe(c.expected);
    }
  });

  test('filterRegionsByGender partitions included/excluded', () => {
    const regions = ['vagina', 'penis', 'mouth'] as const;

    const female = filterRegionsByGender([...regions], 'female');
    expect(female.included).toContain('vagina');
    expect(female.included).toContain('mouth');
    expect(female.excluded).toContain('penis');

    const male = filterRegionsByGender([...regions], 'male');
    expect(male.included).toContain('penis');
    expect(male.included).toContain('mouth');
    expect(male.excluded).toContain('vagina');
  });
});
