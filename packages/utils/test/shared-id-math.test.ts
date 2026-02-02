import { describe, it, expect } from 'vitest';
import {
  generateId,
  isUuid,
  toSessionId,
  toEntityProfileId,
  toId,
  toIds,
} from '../src/shared/id.js';
import { clamp } from '../src/shared/math.js';

describe('shared id and math', () => {
  it('generates uuid-like id', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(20);
  });

  it('validates UUIDs correctly', () => {
    // Valid UUIDs
    expect(isUuid('89dcf560-f144-4bc6-a3cd-dad235ed4351')).toBe(true);
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);

    // Invalid UUIDs
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('89dcf560-f144-4bc6-a3cd-dad235ed435Z')).toBe(false);
    expect(isUuid('89dcf560-f144-4bc6-a3cd')).toBe(false);
    expect(isUuid('')).toBe(false);
  });

  it('coerces ids without changing values', () => {
    expect(toSessionId('session-1')).toBe('session-1');
    expect(toEntityProfileId('entity-1')).toBe('entity-1');
    expect(toId('id-1')).toBe('id-1');
    expect(toIds(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
