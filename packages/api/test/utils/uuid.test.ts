import { describe, it, expect } from 'vitest';
import { toSessionId, toEntityProfileId, toId, toIds, isUuid } from '../../src/utils/uuid.js';

describe('utils/uuid', () => {
  it('coerces ids without changing values', () => {
    expect(toSessionId('session-1')).toBe('session-1');
    expect(toEntityProfileId('entity-1')).toBe('entity-1');
    expect(toId('id-1')).toBe('id-1');
    expect(toIds(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('detects valid UUIDs', () => {
    expect(isUuid('89dcf560-f144-4bc6-a3cd-dad235ed4351')).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('89dcf560-f144-4bc6-a3cd-dad235ed435Z')).toBe(false);
  });
});
