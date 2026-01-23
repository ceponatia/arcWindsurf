import { describe, expect, test } from 'vitest';
import { ParsedPlayerInputSchema } from '../src/api/parsed-input.js';
import parsedPlayerInputFixture from './fixtures/parsed-player-input-v1.json' with {
  type: 'json',
};

describe('api/parsed-input schema', () => {
  test('parses a minimal valid payload', () => {
    const payload = {
      rawInput: 'Hello there',
      segments: [
        {
          id: 'seg-1',
          type: 'speech',
          content: 'Hello there',
          observable: true,
        },
      ],
    };

    expect(() => ParsedPlayerInputSchema.parse(payload)).not.toThrow();
  });

  test('rejects segments with invalid confidence bounds', () => {
    const payload = {
      rawInput: 'Hello there',
      segments: [
        {
          id: 'seg-1',
          type: 'speech',
          content: 'Hello there',
          observable: true,
          confidence: 1.5,
        },
      ],
    };

    expect(() => ParsedPlayerInputSchema.parse(payload)).toThrow();
  });

  test('parses legacy parsed-input fixture', () => {
    expect(() => ParsedPlayerInputSchema.parse(parsedPlayerInputFixture)).not.toThrow();
  });

  test('survives JSON round-trip', () => {
    const payload = {
      rawInput: 'Hello there',
      segments: [
        {
          id: 'seg-1',
          type: 'speech',
          content: 'Hello there',
          observable: true,
          confidence: 0.8,
          rawMarkers: { prefix: '*', suffix: '*' },
        },
      ],
      warnings: ['none'],
    };

    const parsed = ParsedPlayerInputSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => ParsedPlayerInputSchema.parse(roundTripped)).not.toThrow();
  });
});
