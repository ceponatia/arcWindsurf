import { describe, expect, test } from 'vitest';
import {
  ActionSequenceResultSchema,
  ActionSequenceSchema,
} from '../src/api/action-sequence.js';
import actionSequenceFixture from './fixtures/action-sequence-v1.json' with { type: 'json' };
import actionSequenceResultFixture from './fixtures/action-sequence-result-v1.json' with {
  type: 'json',
};

describe('api/action-sequence schemas', () => {
  test('parses a valid action sequence', () => {
    const payload = {
      actions: [
        {
          id: 'action-1',
          order: 1,
          type: 'move',
          description: 'Move to the door',
        },
      ],
      dependencies: {
        'action-1': [],
      },
    };

    expect(() => ActionSequenceSchema.parse(payload)).not.toThrow();
  });

  test('rejects actions with non-positive order', () => {
    const payload = {
      actions: [
        {
          id: 'action-1',
          order: 0,
          type: 'move',
          description: 'Move to the door',
        },
      ],
      dependencies: {
        'action-1': [],
      },
    };

    expect(() => ActionSequenceSchema.parse(payload)).toThrow();
  });

  test('parses a valid action sequence result', () => {
    const payload = {
      completedActions: [],
      pendingActions: [],
      accumulatedContext: { perAction: [] },
      finalState: {},
    };

    expect(() => ActionSequenceResultSchema.parse(payload)).not.toThrow();
  });

  test('rejects action sequence results without accumulated context', () => {
    const payload = {
      completedActions: [],
      pendingActions: [],
      finalState: {},
    };

    expect(() => ActionSequenceResultSchema.parse(payload)).toThrow();
  });

  test('parses legacy action sequence fixture', () => {
    expect(() => ActionSequenceSchema.parse(actionSequenceFixture)).not.toThrow();
  });

  test('parses legacy action sequence result fixture', () => {
    expect(() => ActionSequenceResultSchema.parse(actionSequenceResultFixture)).not.toThrow();
  });

  test('survives JSON round-trip for action sequence result', () => {
    const payload = {
      completedActions: [],
      pendingActions: [
        {
          id: 'action-1',
          order: 1,
          type: 'move',
          description: 'Move to the door',
          target: 'door',
        },
      ],
      accumulatedContext: {
        perAction: [
          {
            actionId: 'action-1',
            actionDescription: 'Move to the door',
            sensory: { sight: [] },
          },
        ],
      },
      finalState: { locationId: 'hall' },
    };

    const parsed = ActionSequenceResultSchema.parse(payload);
    const roundTripped = JSON.parse(JSON.stringify(parsed));

    expect(() => ActionSequenceResultSchema.parse(roundTripped)).not.toThrow();
  });
});
