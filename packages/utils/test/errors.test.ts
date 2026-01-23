import { describe, it, expect } from 'vitest';
import { getErrorMessage, isAbortError } from '../src/errors/errors.js';

describe('errors', () => {
  it('extracts error messages with fallback', () => {
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom');
    expect(getErrorMessage('Oops')).toBe('Oops');
    expect(getErrorMessage({ message: 'Wrapped' })).toBe('Wrapped');
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
  });

  it('detects abort errors', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    expect(isAbortError(err)).toBe(true);
  });
});
