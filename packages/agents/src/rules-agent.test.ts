import { describe, it, expect } from 'vitest';
import { RulesAgent } from './rules-agent.js';
import type { AgentInput, AgentIntent, InventorySlice } from './types.js';

function createMockInput(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    sessionId: 'test-session',
    playerInput: 'test input',
    stateSlices: {},
    ...overrides,
  };
}

function createMockInventory(overrides: Partial<InventorySlice> = {}): InventorySlice {
  return {
    items: [],
    ...overrides,
  };
}

function createUseIntent(item?: string, target?: string): AgentIntent {
  return {
    type: 'use',
    params: { item, target },
    confidence: 1,
  };
}

function createTakeIntent(item?: string): AgentIntent {
  return {
    type: 'take',
    params: { item, target: item },
    confidence: 1,
  };
}

function createGiveIntent(item?: string, target?: string): AgentIntent {
  return {
    type: 'give',
    params: { item, target },
    confidence: 1,
  };
}

describe('RulesAgent', () => {
  const agent = new RulesAgent();

  describe('canHandle', () => {
    it('handles use intents', () => {
      expect(agent.canHandle(createUseIntent())).toBe(true);
    });

    it('handles take intents', () => {
      expect(agent.canHandle(createTakeIntent())).toBe(true);
    });

    it('handles give intents', () => {
      expect(agent.canHandle(createGiveIntent())).toBe(true);
    });

    it('handles attack intents', () => {
      const intent: AgentIntent = { type: 'attack', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(true);
    });

    it('does not handle move intents', () => {
      const intent: AgentIntent = { type: 'move', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(false);
    });
  });

  describe('use handling', () => {
    it('asks what to use when no item specified', async () => {
      const input = createMockInput({
        intent: createUseIntent(),
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('What do you want to use');
    });

    it('fails when item not in inventory', async () => {
      const inventory = createMockInventory();
      const input = createMockInput({
        intent: createUseIntent('sword'),
        stateSlices: { inventory },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain("don't have");
    });

    it('uses item successfully', async () => {
      const inventory = createMockInventory({
        items: [{ id: 'item-1', name: 'Healing Potion', usable: true }],
      });
      const input = createMockInput({
        intent: createUseIntent('healing potion'),
        stateSlices: { inventory },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('use the Healing Potion');
      expect(result.events).toBeDefined();
      expect(result.events?.[0]?.type).toBe('item_used');
    });

    it('fails when item is not usable', async () => {
      const inventory = createMockInventory({
        items: [{ id: 'item-1', name: 'Rock', usable: false }],
      });
      const input = createMockInput({
        intent: createUseIntent('rock'),
        stateSlices: { inventory },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('cannot use');
    });
  });

  describe('take handling', () => {
    it('asks what to take when no item specified', async () => {
      const input = createMockInput({
        intent: createTakeIntent(),
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('What do you want to take');
    });

    it('takes item successfully', async () => {
      const input = createMockInput({
        intent: createTakeIntent('coin'),
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('pick up');
      expect(result.events?.[0]?.type).toBe('item_taken');
    });

    it('fails when inventory is full', async () => {
      const inventory = createMockInventory({
        items: [{ id: 'item-1', name: 'Existing Item' }],
        capacity: 1,
      });
      const input = createMockInput({
        intent: createTakeIntent('coin'),
        stateSlices: { inventory },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('inventory is full');
    });
  });

  describe('give handling', () => {
    it('asks what to give when no item specified', async () => {
      const input = createMockInput({
        intent: createGiveIntent(),
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('What do you want to give');
    });

    it('asks who to give to when no target', async () => {
      const input = createMockInput({
        intent: createGiveIntent('coin'),
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('Who do you want to give');
    });

    it('gives item successfully', async () => {
      const inventory = createMockInventory({
        items: [{ id: 'item-1', name: 'Gold Coin' }],
      });
      const input = createMockInput({
        intent: createGiveIntent('gold coin', 'merchant'),
        stateSlices: { inventory },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('give the Gold Coin to merchant');
      expect(result.statePatches).toBeDefined();
      expect(result.events?.[0]?.type).toBe('item_given');
    });
  });

  describe('attack handling', () => {
    it('asks who to attack when no target', async () => {
      const input = createMockInput({
        intent: { type: 'attack', params: {}, confidence: 1 },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('Who or what do you want to attack');
    });

    it('initiates combat with target', async () => {
      const input = createMockInput({
        intent: { type: 'attack', params: { target: 'goblin' }, confidence: 1 },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('attack goblin');
      expect(result.events?.[0]?.type).toBe('combat_initiated');
      expect(result.diagnostics?.warnings).toContain('Combat system not fully implemented');
    });
  });
});
