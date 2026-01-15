import { describe, expect, test } from 'vitest';
import { resolveBodyRegion, isBodyReference } from '../src/character/index.js';

describe('character/regions side parsing', () => {
  test('handles side prefixes with mixed separators', () => {
    expect(resolveBodyRegion('  left--arm  ')).toBe('leftArm');
  });

  test('handles side suffixes with extra whitespace', () => {
    expect(resolveBodyRegion('foot    right')).toBe('rightFoot');
  });

  test('keeps non-sided references intact', () => {
    expect(isBodyReference('torso-center')).toBe(true);
  });
});
