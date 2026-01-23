import { describe, expect, test } from 'vitest';
import { EffectSchema } from '../src/events/effects.js';
import effectFixture from './fixtures/effect-moved-v1.json' with { type: 'json' };

describe('events/effects schema', () => {
  test('parses effect variants', () => {
    expect(() =>
      EffectSchema.parse({
        type: 'MOVED',
        sessionId: 'session-1',
        actorId: 'npc-1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
      })
    ).not.toThrow();

    expect(() =>
      EffectSchema.parse({
        type: 'SPOKE',
        sessionId: 'session-1',
        actorId: 'npc-1',
        content: 'Hello',
      })
    ).not.toThrow();

    expect(() =>
      EffectSchema.parse({
        type: 'DAMAGED',
        sessionId: 'session-1',
        actorId: 'npc-1',
        amount: 5,
      })
    ).not.toThrow();
  });

  test('rejects unknown effect types', () => {
    expect(() =>
      EffectSchema.parse({
        type: 'UNKNOWN_EFFECT',
        sessionId: 'session-1',
      })
    ).toThrow();
  });

  test('rejects non-date timestamps', () => {
    expect(() =>
      EffectSchema.parse({
        type: 'MOVED',
        sessionId: 'session-1',
        actorId: 'npc-1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
        timestamp: '2024-01-01T00:00:00.000Z',
      })
    ).toThrow();
  });

  test('parses legacy effect fixture', () => {
    expect(() => EffectSchema.parse(effectFixture)).not.toThrow();
  });

  test('documents JSON round-trip behavior for timestamps', () => {
    const payload = {
      type: 'MOVED',
      sessionId: 'session-1',
      actorId: 'npc-1',
      fromLocationId: 'loc-1',
      toLocationId: 'loc-2',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
    };

    const parsed = EffectSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => EffectSchema.parse(roundTripped)).toThrow();
  });
});
