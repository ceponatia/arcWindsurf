import { describe, it, expect } from 'vitest';
import { mapMessageResponse } from '../../src/mappers/message-mappers.js';

describe('mappers/message-mappers', () => {
  it('maps db messages to API response', () => {
    const message = {
      role: 'assistant',
      content: 'Hello',
      createdAt: new Date('2026-01-22T00:00:00.000Z'),
    };

    const result = mapMessageResponse(message as never);

    expect(result).toEqual({
      role: 'assistant',
      content: 'Hello',
      createdAt: new Date('2026-01-22T00:00:00.000Z'),
    });
  });
});
