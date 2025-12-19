import { SENSORY_INTENT_TYPES, isSensoryIntent } from '../src/sensory/types.js';
import type { IntentType } from '../src/core/types.js';

describe('sensory types', () => {
  test('isSensoryIntent narrows sensory intent types', () => {
    const cases: { type: IntentType; expected: boolean }[] = [
      { type: 'smell', expected: true },
      { type: 'touch', expected: true },
      { type: 'listen', expected: true },
      { type: 'move', expected: false },
    ];

    for (const { type, expected } of cases) {
      expect(isSensoryIntent(type)).toBe(expected);
    }
  });

  test('SENSORY_INTENT_TYPES lists all sensory intents', () => {
    expect(SENSORY_INTENT_TYPES).toEqual(['smell', 'taste', 'touch', 'listen']);
  });
});
