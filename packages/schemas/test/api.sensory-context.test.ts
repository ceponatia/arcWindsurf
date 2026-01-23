import { describe, expect, test } from 'vitest';
import { SensoryContextForNpcSchema } from '../src/api/sensory-context.js';
import sensoryContextFixture from './fixtures/sensory-context-npc-v1.json' with { type: 'json' };

describe('api/sensory-context schema', () => {
  test('parses a minimal valid sensory context', () => {
    const payload = {
      available: {
        smell: [{ source: 'air', description: 'fresh', intensity: 0.4 }],
      },
      narrativeHints: {
        playerIsSniffing: false,
        playerIsTouching: false,
        playerIsTasting: false,
        recentSensoryAction: false,
      },
    };

    expect(() => SensoryContextForNpcSchema.parse(payload)).not.toThrow();
  });

  test('rejects sensory details with out-of-range intensity', () => {
    const payload = {
      available: {
        smell: [{ source: 'air', description: 'too strong', intensity: 2 }],
      },
      narrativeHints: {
        playerIsSniffing: false,
        playerIsTouching: false,
        playerIsTasting: false,
        recentSensoryAction: false,
      },
    };

    expect(() => SensoryContextForNpcSchema.parse(payload)).toThrow();
  });

  test('parses legacy sensory context fixture', () => {
    expect(() => SensoryContextForNpcSchema.parse(sensoryContextFixture)).not.toThrow();
  });

  test('survives JSON round-trip', () => {
    const payload = {
      available: {
        sight: [{ source: 'torch', description: 'warm light', intensity: 0.6 }],
      },
      playerFocus: {
        sense: 'sight',
        target: 'torch',
      },
      narrativeHints: {
        playerIsSniffing: false,
        playerIsTouching: false,
        playerIsTasting: false,
        recentSensoryAction: true,
      },
    };

    const parsed = SensoryContextForNpcSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => SensoryContextForNpcSchema.parse(roundTripped)).not.toThrow();
  });
});
