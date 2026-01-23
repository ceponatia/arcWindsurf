import { describe, expect, test } from 'vitest';
import { NpcResponseConfigSchema } from '../src/api/npc-config.js';
import npcResponseConfigFixture from './fixtures/npc-response-config-v1.json' with {
  type: 'json',
};

describe('api/npc-config schema', () => {
  test('applies defaults', () => {
    const parsed = NpcResponseConfigSchema.parse({});

    expect(parsed).toEqual({
      minSentencesPerAction: 2,
      maxSentencesPerAction: 3,
      minSensoryDetailsPerAction: 1,
      enforceTemporalOrdering: true,
      showPendingActions: true,
    });
  });

  test('rejects invalid numeric bounds', () => {
    expect(() => NpcResponseConfigSchema.parse({ minSentencesPerAction: 0 })).toThrow();
    expect(() => NpcResponseConfigSchema.parse({ maxSentencesPerAction: -1 })).toThrow();
  });

  test('parses legacy npc config fixture', () => {
    expect(() => NpcResponseConfigSchema.parse(npcResponseConfigFixture)).not.toThrow();
  });

  test('survives JSON round-trip', () => {
    const parsed = NpcResponseConfigSchema.parse({
      minSentencesPerAction: 2,
      maxSentencesPerAction: 4,
      minSensoryDetailsPerAction: 1,
      enforceTemporalOrdering: true,
      showPendingActions: false,
    });

    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => NpcResponseConfigSchema.parse(roundTripped)).not.toThrow();
  });
});
