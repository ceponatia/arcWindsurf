import { describe, it, expect } from 'vitest';
import { safeJsonStringify, jsonifyBigInts } from '../../src/utils/json.js';

/**
 * Build a nested value containing BigInt and Date values.
 */
function buildValue(): { id: bigint; createdAt: Date; list: Array<bigint | { nested: bigint }> } {
  return {
    id: 42n,
    createdAt: new Date('2026-01-22T00:00:00.000Z'),
    list: [7n, { nested: 9n }],
  };
}

describe('utils/json', () => {
  it('safeJsonStringify converts BigInt values to strings', () => {
    const payload = { count: 5n };
    const text = safeJsonStringify(payload);
    expect(text).toBe('{"count":"5"}');
  });

  it('jsonifyBigInts converts BigInt and Date values recursively', () => {
    const value = buildValue();
    const result = jsonifyBigInts(value);

    expect(result).toEqual({
      id: '42',
      createdAt: '2026-01-22T00:00:00.000Z',
      list: ['7', { nested: '9' }],
    });
  });

  it('jsonifyBigInts preserves primitives', () => {
    const result = jsonifyBigInts({ ok: true, text: 'hi', num: 3 });
    expect(result).toEqual({ ok: true, text: 'hi', num: 3 });
  });
});
