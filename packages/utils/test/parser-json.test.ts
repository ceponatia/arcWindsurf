import { describe, it, expect } from 'vitest';
import { parseJson, parseJsonWithSchema } from '../src/parsers/json.js';

describe('parser json', () => {
  it('parses JSON into unknown', () => {
    expect(parseJson('{"ok":true}')).toEqual({ ok: true });
  });

  it('validates with schema', () => {
    const schema = {
      safeParse: (value: unknown) =>
        typeof value === 'object'
          ? { success: true as const, data: value }
          : { success: false as const, error: { message: 'bad' } },
    };
    expect(parseJsonWithSchema('{"a":1}', schema)).toEqual({ a: 1 });
    expect(() => parseJsonWithSchema('"no"', schema)).toThrow('bad');
  });
});
