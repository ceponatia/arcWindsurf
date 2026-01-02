import { mapTurnResultToDto } from '../../src/routes/game/turns/turn-result-mapper.js';
import type { TurnResult } from '@minimal-rpg/governor';
import type { Speaker } from '../../src/types.js';

describe('mapTurnResultToDto', () => {
  const speaker: Speaker = { id: 'npc-1', name: 'Narrator' };

  const cases: { name: string; input: TurnResult; speaker?: Speaker }[] = [
    {
      name: 'maps full turn result with metadata and state changes',
      input: {
        message: 'Turn complete',
        events: [
          {
            type: 'info',
            timestamp: new Date('2024-06-01T00:00:00Z'),
            payload: { detail: 'something happened' },
            source: 'system',
          },
        ],
        stateChanges: {
          patchCount: 2,
          modifiedPaths: ['character.name', 'setting.weather'],
        },
        metadata: {
          processingTimeMs: 120,
          agentsInvoked: ['npc'],
          nodesRetrieved: 3,
          phaseTiming: {},
        },
        success: true,
      },
      speaker,
    },
    {
      name: 'maps minimal turn result without optional fields',
      input: {
        message: 'Fallback',
        events: [],
        success: false,
        error: { code: 'E_FAIL', message: 'failed', phase: 'generation' },
      },
    },
  ];

  for (const { name, input, speaker: testSpeaker } of cases) {
    it(name, () => {
      const dto = mapTurnResultToDto(input, testSpeaker);

      expect(dto).toEqual({
        message: input.message,
        speaker: testSpeaker,
        events: input.events,
        stateChanges: input.stateChanges,
        metadata: input.metadata,
        success: input.success,
      });
    });
  }
});
