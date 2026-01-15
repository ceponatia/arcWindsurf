import { describe, expect, test } from 'vitest';
import { parseBodyEntry } from '../src/parsers/body-parser/parsers.js';

describe('body-parser length guard', () => {
  test('returns null for overlong entries', () => {
    const long = 'a'.repeat(1001);
    expect(parseBodyEntry(long)).toBeNull();
  });
});
