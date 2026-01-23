import { describe, expect, test } from 'vitest';
import {
  getRecord,
  getRecordOptional,
  getPartialRecord,
  setRecord,
  setPartialRecord,
  getArraySafe,
  getTuple,
} from '../src/shared/record-helpers.js';

describe('shared/record-helpers', () => {
  test('getRecord and setRecord read/write predictable values', () => {
    type Key = 'alpha' | 'beta';
    const record: Record<Key, number> = { alpha: 1, beta: 2 };

    expect(getRecord(record, 'beta')).toBe(2);
    setRecord(record, 'beta', 5);
    expect(record.beta).toBe(5);
  });

  test('getRecordOptional and getPartialRecord handle missing data', () => {
    type Key = 'alpha' | 'beta';
    const partial: Partial<Record<Key, number>> = { alpha: 1 };

    expect(getRecordOptional(partial, 'beta')).toBeUndefined();
    expect(getPartialRecord(partial, 'beta')).toBeUndefined();

    const missing: Partial<Record<Key, number>> | undefined = undefined;
    expect(getRecordOptional(missing, 'alpha')).toBeUndefined();
  });

  test('setPartialRecord writes optional values safely', () => {
    type Key = 'alpha' | 'beta';
    const partial: Partial<Record<Key, number>> = {};

    setPartialRecord(partial, 'alpha', 9);
    expect(partial.alpha).toBe(9);
  });

  test('getArraySafe and getTuple support safe indexing', () => {
    const values = ['first', 'second'];
    expect(getArraySafe(values, 1)).toBe('second');
    expect(getArraySafe(values, 5)).toBeUndefined();

    const tuple = [10, 20, 30] as const;
    expect(getTuple(tuple, 1)).toBe(20);

    type Level = 0 | 1 | 2;
    const multipliers: Record<Level, string> = { 0: 'low', 1: 'mid', 2: 'high' };
    expect(getTuple(multipliers, 2)).toBe('high');
  });
});
