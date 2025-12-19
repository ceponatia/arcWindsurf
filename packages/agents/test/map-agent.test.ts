import { MapAgent } from '../src/map/map-agent.js';
import type {
  AgentInput,
  AgentIntent,
  IntentParams,
  IntentType,
  LocationExit,
  LocationSlice,
} from '../src/core/types.js';

const baseInput: AgentInput = {
  sessionId: 's1',
  playerInput: 'go',
  stateSlices: {},
};

function makeIntent(type: IntentType, params: IntentParams = {}): AgentIntent {
  return { type, params, confidence: 1 };
}

function makeLocation(overrides: Partial<LocationSlice> = {}): LocationSlice {
  return {
    id: 'room-a',
    name: 'Room A',
    description: 'A small room.',
    exits: [],
    ...overrides,
  };
}

describe('MapAgent', () => {
  test('canHandle only accepts map intents', () => {
    const agent = new MapAgent();
    const cases: { type: IntentType; expected: boolean }[] = [
      { type: 'move', expected: true },
      { type: 'look', expected: true },
      { type: 'attack', expected: false },
    ];

    for (const { type, expected } of cases) {
      expect(agent.canHandle(makeIntent(type))).toBe(expected);
    }
  });

  test('move intent handles accessible, blocked, missing, and unknown exits', async () => {
    const exits: LocationExit[] = [
      { direction: 'north', targetId: 'room-b', description: 'A doorway' },
      { direction: 'east', targetId: 'room-c', accessible: false },
    ];

    const cases = [
      {
        name: 'moves through accessible exit',
        intent: makeIntent('move', { direction: 'north' }),
        expected: {
          narrativeIncludes: 'head north',
          statePatchPath: '/location/id',
          eventType: 'location_changed',
        },
      },
      {
        name: 'blocked exit returns explanation',
        intent: makeIntent('move', { direction: 'east' }),
        expected: { narrativeIncludes: 'blocked', statePatchPath: undefined, eventType: undefined },
      },
      {
        name: 'missing direction describes exits',
        intent: makeIntent('move', {}),
        expected: { narrativeIncludes: 'From here, you can go', statePatchPath: undefined },
      },
      {
        name: 'unknown direction rejects move',
        intent: makeIntent('move', { direction: 'south' }),
        expected: { narrativeIncludes: 'cannot go south', statePatchPath: undefined },
      },
      {
        name: 'no location yields undefined space message',
        intent: makeIntent('move', { direction: 'north' }),
        location: null,
        expected: { narrativeIncludes: 'undefined space', statePatchPath: undefined },
      },
    ];

    const agent = new MapAgent();

    for (const { intent, expected, location } of cases) {
      const input: AgentInput =
        location === null
          ? { ...baseInput, intent, stateSlices: {} }
          : { ...baseInput, intent, stateSlices: { location: makeLocation({ exits }) } };

      const result = await agent.execute(input);
      expect(result.narrative.toLowerCase()).toContain(expected.narrativeIncludes.toLowerCase());
      if (expected.statePatchPath) {
        expect(result.statePatches?.[0]?.path).toBe(expected.statePatchPath);
        expect(result.events?.[0]?.type).toBe(expected.eventType);
      } else {
        expect(result.statePatches ?? []).toHaveLength(0);
      }
    }
  });

  test('look intent uses knowledge context when targeting specific item', async () => {
    const agent = new MapAgent();
    const input: AgentInput = {
      ...baseInput,
      intent: makeIntent('look', { target: 'painting' }),
      stateSlices: { location: makeLocation() },
      knowledgeContext: [
        { path: 'room.desc', content: 'A painting of a landscape', score: 0.9 },
        { path: 'other', content: 'Irrelevant', score: 0.1 },
      ],
    };

    const result = await agent.execute(input);
    expect(result.narrative).toBe('A painting of a landscape');
  });

  test('look intent without target describes location and exits', async () => {
    const agent = new MapAgent();
    const input: AgentInput = {
      ...baseInput,
      intent: makeIntent('look', {}),
      stateSlices: {
        location: makeLocation({ exits: [{ direction: 'north', targetId: 'room-b' }] }),
      },
    };

    const result = await agent.execute(input);
    expect(result.narrative).toContain('Room A');
    expect(result.narrative).toContain('north');
  });
});
