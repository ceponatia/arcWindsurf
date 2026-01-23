import { describe, expect, test } from 'vitest';
import { IntentSchema } from '../src/events/intents.js';
import intentFixture from './fixtures/intent-move-v1.json' with { type: 'json' };

describe('events/intents schema', () => {
  test('parses intent variants', () => {
    expect(() =>
      IntentSchema.parse({
        type: 'MOVE_INTENT',
        sessionId: 'session-1',
        destinationId: 'loc-1',
      })
    ).not.toThrow();

    expect(() =>
      IntentSchema.parse({
        type: 'SPEAK_INTENT',
        sessionId: 'session-1',
        content: 'Hi',
        targetActorId: 'npc-1',
      })
    ).not.toThrow();

    expect(() =>
      IntentSchema.parse({
        type: 'WAIT_INTENT',
        sessionId: 'session-1',
        duration: 5,
      })
    ).not.toThrow();
  });

  test('rejects unknown intent types', () => {
    expect(() =>
      IntentSchema.parse({
        type: 'UNKNOWN_INTENT',
        sessionId: 'session-1',
      })
    ).toThrow();
  });

  test('rejects non-date timestamps', () => {
    expect(() =>
      IntentSchema.parse({
        type: 'MOVE_INTENT',
        sessionId: 'session-1',
        destinationId: 'loc-1',
        timestamp: '2024-01-01T00:00:00.000Z',
      })
    ).toThrow();
  });

  test('parses legacy intent fixture', () => {
    expect(() => IntentSchema.parse(intentFixture)).not.toThrow();
  });

  test('documents JSON round-trip behavior for timestamps', () => {
    const payload = {
      type: 'MOVE_INTENT',
      sessionId: 'session-1',
      destinationId: 'loc-1',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
    };

    const parsed = IntentSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => IntentSchema.parse(roundTripped)).toThrow();
  });
});
