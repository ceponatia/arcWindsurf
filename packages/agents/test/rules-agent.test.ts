import { RulesAgent } from '../src/rules/rules-agent.js';
import type {
  AgentInput,
  AgentIntent,
  IntentParams,
  IntentType,
  InventoryItem,
} from '../src/core/types.js';

const baseInput: AgentInput = {
  sessionId: 's1',
  playerInput: 'do thing',
  stateSlices: { inventory: { items: [] } },
};

function makeIntent(type: IntentType, params: IntentParams = {}): AgentIntent {
  return { type, params, confidence: 1 };
}

describe('RulesAgent', () => {
  test('canHandle only accepts rules intents', () => {
    const agent = new RulesAgent();
    const cases: { type: IntentType; expected: boolean }[] = [
      { type: 'use', expected: true },
      { type: 'take', expected: true },
      { type: 'attack', expected: true },
      { type: 'move', expected: false },
    ];

    for (const { type, expected } of cases) {
      expect(agent.canHandle(makeIntent(type))).toBe(expected);
    }
  });

  test('use intent validates item presence and usability', async () => {
    const agent = new RulesAgent();

    const items: InventoryItem[] = [
      { id: 'i1', name: 'torch', usable: true },
      { id: 'i2', name: 'rock', usable: false },
    ];

    const cases = [
      {
        name: 'prompts when item missing',
        input: { intent: makeIntent('use', {}), inventoryItems: [] },
        expected: 'what do you want to use',
      },
      {
        name: 'rejects when item not owned',
        input: { intent: makeIntent('use', { item: 'key' }), inventoryItems: items },
        expected: "don't have a key",
      },
      {
        name: 'rejects when item not usable',
        input: { intent: makeIntent('use', { item: 'rock' }), inventoryItems: items },
        expected: 'cannot use the rock',
      },
      {
        name: 'emits event when item is used on target',
        input: {
          intent: makeIntent('use', { item: 'torch', target: 'door' }),
          inventoryItems: items,
        },
        expected: 'use the torch on door',
        expectEvent: 'item_used',
      },
    ];

    for (const { input, expected, expectEvent } of cases) {
      const result = await agent.execute({
        ...baseInput,
        intent: input.intent,
        stateSlices: { inventory: { items: input.inventoryItems ?? [] } },
      });

      expect(result.narrative.toLowerCase()).toContain(expected.toLowerCase());
      if (expectEvent) {
        expect(result.events?.[0]?.type).toBe(expectEvent);
      }
    }
  });

  test('take intent checks capacity and emits event', async () => {
    const agent = new RulesAgent();
    const cases = [
      {
        name: 'asks for item when none provided',
        intent: makeIntent('take', {}),
        inventory: { items: [] },
        expected: 'what do you want to take',
      },
      {
        name: 'rejects when inventory is full',
        intent: makeIntent('take', { item: 'orb' }),
        inventory: { items: [{ id: 'i1', name: 'torch' }], capacity: 1 },
        expected: 'inventory is full',
      },
      {
        name: 'picks up item and emits event',
        intent: makeIntent('take', { item: 'orb' }),
        inventory: { items: [], capacity: 2 },
        expected: 'pick up the orb',
        expectEvent: 'item_taken',
      },
    ];

    for (const { intent, inventory, expected, expectEvent } of cases) {
      const result = await agent.execute({
        ...baseInput,
        intent,
        stateSlices: { inventory },
      });

      expect(result.narrative.toLowerCase()).toContain(expected.toLowerCase());
      if (expectEvent) {
        expect(result.events?.[0]?.type).toBe(expectEvent);
      }
    }
  });

  test('give intent validates item and target, removes from inventory, and emits event', async () => {
    const agent = new RulesAgent();
    const inventoryItems: InventoryItem[] = [
      { id: 'i1', name: 'apple' },
      { id: 'i2', name: 'book' },
    ];

    const cases = [
      {
        name: 'asks for item when missing',
        intent: makeIntent('give', { target: 'npc' }),
        expected: 'what do you want to give',
      },
      {
        name: 'asks for recipient when missing',
        intent: makeIntent('give', { item: 'apple' }),
        expected: 'who do you want to give',
      },
      {
        name: 'rejects when item not owned',
        intent: makeIntent('give', { item: 'sword', target: 'npc' }),
        expected: "don't have a sword",
      },
      {
        name: 'removes owned item, produces patch and event',
        intent: makeIntent('give', { item: 'book', target: 'npc' }),
        expected: 'give the book to npc',
        expectPatchPath: '/inventory/items/1',
        expectEvent: 'item_given',
      },
    ];

    for (const { intent, expected, expectPatchPath, expectEvent } of cases) {
      const result = await agent.execute({
        ...baseInput,
        intent,
        stateSlices: { inventory: { items: inventoryItems } },
      });

      expect(result.narrative.toLowerCase()).toContain(expected.toLowerCase());
      if (expectPatchPath) {
        expect(result.statePatches?.[0]?.path).toBe(expectPatchPath);
        expect(result.events?.[0]?.type).toBe(expectEvent);
      }
    }
  });

  test('attack intent requires target and emits event', async () => {
    const agent = new RulesAgent();

    const cases = [
      { intent: makeIntent('attack', {}), expected: 'who or what do you want to attack' },
      {
        intent: makeIntent('attack', { target: 'goblin' }),
        expected: 'prepare to attack goblin',
        expectEvent: 'combat_initiated',
      },
    ];

    for (const { intent, expected, expectEvent } of cases) {
      const result = await agent.execute({ ...baseInput, intent });
      expect(result.narrative.toLowerCase()).toContain(expected.toLowerCase());
      if (expectEvent) {
        expect(result.events?.[0]?.type).toBe(expectEvent);
      }
    }
  });
});
