import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { nullableOptional, numericString } from '../src/utils/schema-helpers.js';

describe('utils/schema-helpers', () => {
  test('nullableOptional treats null as undefined and enforces inner schema', () => {
    const schema = nullableOptional(z.string().min(1));

    expect(schema.parse('ok')).toBe('ok');
    expect(schema.parse(null)).toBeUndefined();
    expect(schema.parse(undefined)).toBeUndefined();
    expect(() => schema.parse('')).toThrow();
  });

  test('numericString coerces valid numbers and returns undefined for invalid input', () => {
    expect(numericString.parse('42.5')).toBe(42.5);
    expect(numericString.parse('')).toBeUndefined();
    expect(numericString.parse('nope')).toBeUndefined();
  });
});
