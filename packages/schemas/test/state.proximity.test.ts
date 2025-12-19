import {
  createDefaultProximityState,
  makeEngagementKey,
  parseEngagementKey,
} from '../src/state/index.js';
import type { SenseType } from '../src/state/index.js';

describe('state/proximity', () => {
  test('createDefaultProximityState returns empty records', () => {
    const state = createDefaultProximityState();
    expect(state).toEqual({ engagements: {}, npcProximity: {} });
  });

  test('makeEngagementKey concatenates parts predictably', () => {
    const cases = [
      { npcId: 'npc-1', bodyPart: 'hair', sense: 'smell' },
      { npcId: 'npc-2', bodyPart: 'hands', sense: 'touch' },
    ];

    for (const { npcId, bodyPart, sense } of cases) {
      expect(makeEngagementKey(npcId, bodyPart, sense as SenseType)).toBe(
        `${npcId}:${bodyPart}:${sense}`
      );
    }
  });

  test('parseEngagementKey validates format and sense type', () => {
    const cases = [
      {
        key: 'alex:hands:touch',
        expected: { npcId: 'alex', bodyPart: 'hands', senseType: 'touch' },
      },
      { key: 'badkey', expected: null },
      { key: 'nova:eyes:see', expected: null },
    ];

    for (const { key, expected } of cases) {
      expect(parseEngagementKey(key)).toEqual(expected as ReturnType<typeof parseEngagementKey>);
    }
  });
});
