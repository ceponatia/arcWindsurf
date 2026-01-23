import { describe, expect, test } from 'vitest';
import { SystemEventSchema } from '../src/events/system.js';
import systemEventFixture from './fixtures/system-tick-v1.json' with { type: 'json' };

describe('events/system schema', () => {
  test('parses system event variants', () => {
    expect(() =>
      SystemEventSchema.parse({
        type: 'TICK',
        sessionId: 'session-1',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        tick: 1,
      })
    ).not.toThrow();

    expect(() =>
      SystemEventSchema.parse({
        type: 'SESSION_START',
        sessionId: 'session-1',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      })
    ).not.toThrow();

    expect(() =>
      SystemEventSchema.parse({
        type: 'ACTOR_SPAWN',
        sessionId: 'session-1',
        actorId: 'npc-1',
        actorType: 'npc',
        locationId: 'loc-1',
      })
    ).not.toThrow();
  });

  test('rejects unknown system event types', () => {
    expect(() =>
      SystemEventSchema.parse({
        type: 'UNKNOWN_SYSTEM',
        sessionId: 'session-1',
      })
    ).toThrow();
  });

  test('rejects non-date timestamps when required', () => {
    expect(() =>
      SystemEventSchema.parse({
        type: 'TICK',
        sessionId: 'session-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        tick: 1,
      })
    ).toThrow();
  });

  test('parses legacy system event fixture', () => {
    expect(() => SystemEventSchema.parse(systemEventFixture)).not.toThrow();
  });

  test('documents JSON round-trip behavior for timestamps', () => {
    const payload = {
      type: 'TICK',
      sessionId: 'session-1',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
      tick: 1,
    };

    const parsed = SystemEventSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => SystemEventSchema.parse(roundTripped)).toThrow();
  });
});
