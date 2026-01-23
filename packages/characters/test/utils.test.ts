import { describe, it, expect } from 'vitest';
import { ok, err } from '../src/utils/index.js';

describe('characters utils', () => {
  it('ok returns success result', () => {
    const result = ok('value');
    expect(result).toEqual({ ok: true, value: 'value' });
  });

  it('err returns error result', () => {
    const error = new Error('boom');
    const result = err(error);
    expect(result).toEqual({ ok: false, error });
  });
});
