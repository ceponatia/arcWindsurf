import { describe, expect, test } from 'vitest';
import {
  INTENT_ALIASES,
  INTENT_TYPES,
  getIntentTypeList,
  resolveIntentType,
} from '../src/index.js';

const intentCases = [
  { value: 'move', expected: 'move' },
  { value: 'Go', expected: 'move' },
  { value: 'sniff', expected: 'smell' },
  { value: 'inspect', expected: 'examine' },
  { value: 'unknown-intent', expected: 'unknown' },
];

describe('intents', () => {
  test.each(intentCases)("resolveIntentType('%s')", ({ value, expected }) => {
    expect(resolveIntentType(value)).toBe(expected);
  });

  test('INTENT_ALIASES contains configured sensory aliases', () => {
    expect(INTENT_ALIASES['sniff']).toBe('smell');
    expect(INTENT_ALIASES['inspect']).toBe('examine');
  });

  test('getIntentTypeList lists all types plus unknown', () => {
    const list = getIntentTypeList();
    for (const type of INTENT_TYPES) {
      if (type === 'unknown') continue;
      expect(list.includes(type)).toBe(true);
    }
    expect(list.endsWith('|unknown')).toBe(true);
  });
});
