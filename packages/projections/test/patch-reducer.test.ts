import { describe, it, expect } from 'vitest';
import { patchReducer } from '../src/reducers/patch.js';

const baseState = { foo: { bar: 1 } };

describe('patchReducer', () => {
  it('applies single path/value patch', () => {
    const next = patchReducer(baseState, {
      type: 'STATE_CHANGE',
      path: '/foo/bar',
      value: 2,
    });

    expect(next.foo.bar).toBe(2);
  });

  it('applies patch array', () => {
    const next = patchReducer(baseState, {
      type: 'STATE_CHANGE',
      patches: [{ op: 'replace', path: '/foo/bar', value: 3 }],
    });

    expect(next.foo.bar).toBe(3);
  });

  it('returns same state on invalid event', () => {
    const next = patchReducer(baseState, { type: 'UNKNOWN' });
    expect(next).toBe(baseState);
  });
});
