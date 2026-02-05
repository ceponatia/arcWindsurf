import { describe, it, expect } from 'vitest';
import { isValidCharacterResponse, validateCharacterResponse } from '../validation.js';

describe('studio-npc/validation', () => {
  it('accepts valid character responses', () => {
    const response = 'This is a valid character response with enough detail to pass checks.';
    expect(isValidCharacterResponse(response)).toBe(true);
    expect(validateCharacterResponse(response).valid).toBe(true);
  });

  it('rejects responses that are too short', () => {
    const response = 'Too short.';
    expect(isValidCharacterResponse(response)).toBe(false);
    expect(validateCharacterResponse(response).reason).toBe('Response too short');
  });

  it('rejects code markers and data leakage markers', () => {
    const response = 'Here is code: ```const test = 1;```';
    expect(isValidCharacterResponse(response)).toBe(false);

    const result = validateCharacterResponse(response);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Contains code or data markers');
  });

  it('rejects responses with high special character ratio', () => {
    const response = '{}{}{}{}{}{}{}{}{}{}{}{}{}{}{}{}{}{}{}{}';
    const result = validateCharacterResponse(response);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('High special character ratio');
  });

  it('rejects responses with high number ratio', () => {
    const response = '1234567890123456789012345678901234567890';
    const result = validateCharacterResponse(response);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('High number ratio');
  });
});
