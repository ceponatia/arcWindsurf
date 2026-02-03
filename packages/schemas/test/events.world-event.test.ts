import { describe, expect, test } from 'vitest';
import { WireWorldEventSchema, WorldEventSchema } from '../src/events/index.js';
import worldEventLegacyFixture from './fixtures/world-event-legacy.json' with {
  type: 'json',
};

describe('events/world-event schema', () => {
  test('parses intents, effects, and system events', () => {
    const intent = {
      type: 'MOVE_INTENT',
      sessionId: 'session-1',
      destinationId: 'loc-1',
    };

    const effect = {
      type: 'MOVED',
      sessionId: 'session-1',
      actorId: 'npc-1',
      fromLocationId: 'loc-1',
      toLocationId: 'loc-2',
    };

    const systemEvent = {
      type: 'TICK',
      sessionId: 'session-1',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
      tick: 42,
    };

    expect(() => WorldEventSchema.parse(intent)).not.toThrow();
    expect(() => WorldEventSchema.parse(effect)).not.toThrow();
    expect(() => WorldEventSchema.parse(systemEvent)).not.toThrow();
  });

  test('rejects unknown event types and invalid timestamps', () => {
    expect(() =>
      WorldEventSchema.parse({
        type: 'UNKNOWN_EVENT',
        sessionId: 'session-1',
      })
    ).toThrow();

    expect(() =>
      WorldEventSchema.parse({
        type: 'TICK',
        sessionId: 'session-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        tick: 1,
      })
    ).toThrow();

    expect(() =>
      WireWorldEventSchema.parse({
        type: 'TICK',
        sessionId: 'session-1',
        timestamp: 'not-a-date',
        tick: 1,
      })
    ).toThrow();
  });

  test('parses legacy world event fixture', () => {
    expect(() => WorldEventSchema.parse(worldEventLegacyFixture)).not.toThrow();
  });

  test('documents JSON round-trip behavior for timestamped events', () => {
    const payload = {
      type: 'TICK',
      sessionId: 'session-1',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
      tick: 1,
    };

    const parsed = WorldEventSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => WorldEventSchema.parse(roundTripped)).toThrow();
    expect(() => WireWorldEventSchema.parse(roundTripped)).not.toThrow();
  });

  test('wire schema accepts ISO strings and epoch timestamps', () => {
    const iso = WireWorldEventSchema.parse({
      type: 'TICK',
      sessionId: 'session-1',
      timestamp: '2024-01-01T00:00:00.000Z',
      tick: 1,
    });

    const epoch = WireWorldEventSchema.parse({
      type: 'TICK',
      sessionId: 'session-1',
      timestamp: 1704067200000,
      tick: 2,
    });

    expect(iso.timestamp).toBeInstanceOf(Date);
    expect(epoch.timestamp).toBeInstanceOf(Date);
  });
});
