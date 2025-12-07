import { describe, it, expect } from 'vitest';
import { MapAgent } from './map-agent.js';
import type { AgentInput, AgentIntent, LocationSlice } from '../core/types.js';

function createMockInput(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    sessionId: 'test-session',
    playerInput: 'test input',
    stateSlices: {},
    ...overrides,
  };
}

function createMockLocation(overrides: Partial<LocationSlice> = {}): LocationSlice {
  return {
    id: 'loc-1',
    name: 'Test Location',
    description: 'A test location for testing.',
    exits: [],
    ...overrides,
  };
}

function createMoveIntent(direction: string): AgentIntent {
  return {
    type: 'move',
    params: { direction },
    confidence: 1,
  };
}

function createLookIntent(target?: string): AgentIntent {
  return {
    type: 'look',
    params: target ? { target } : {},
    confidence: 1,
  };
}

describe('MapAgent', () => {
  const agent = new MapAgent();

  describe('canHandle', () => {
    it('handles move intents', () => {
      expect(agent.canHandle(createMoveIntent('north'))).toBe(true);
    });

    it('handles look intents', () => {
      expect(agent.canHandle(createLookIntent())).toBe(true);
    });

    it('does not handle talk intents', () => {
      const intent: AgentIntent = { type: 'talk', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(false);
    });
  });

  describe('execute', () => {
    it('describes location when no intent provided', async () => {
      const location = createMockLocation();
      const input = createMockInput({
        stateSlices: { location },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('Test Location');
      expect(result.narrative).toContain('A test location for testing.');
    });

    it('describes undefined space when no location', async () => {
      const input = createMockInput();
      const result = await agent.execute(input);

      expect(result.narrative).toContain('undefined space');
    });
  });

  describe('move handling', () => {
    it('moves to target when exit exists', async () => {
      const location = createMockLocation({
        exits: [{ direction: 'north', targetId: 'loc-2', description: 'A path leads north.' }],
      });
      const input = createMockInput({
        intent: createMoveIntent('north'),
        stateSlices: { location },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('north');
      expect(result.statePatches).toBeDefined();
      const patch = result.statePatches?.[0];
      expect(patch?.op).toBe('replace');
      if (patch && 'value' in patch) {
        expect(patch.value).toBe('loc-2');
      }
      expect(result.events).toBeDefined();
      expect(result.events?.[0]?.type).toBe('location_changed');
    });

    it('fails when exit does not exist', async () => {
      const location = createMockLocation({ exits: [] });
      const input = createMockInput({
        intent: createMoveIntent('north'),
        stateSlices: { location },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('cannot go north');
      expect(result.statePatches).toBeUndefined();
    });

    it('fails when exit is blocked', async () => {
      const location = createMockLocation({
        exits: [{ direction: 'north', targetId: 'loc-2', accessible: false }],
      });
      const input = createMockInput({
        intent: createMoveIntent('north'),
        stateSlices: { location },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('blocked');
      expect(result.statePatches).toBeUndefined();
    });

    it('lists exits when no direction given', async () => {
      const location = createMockLocation({
        exits: [
          { direction: 'north', targetId: 'loc-2' },
          { direction: 'east', targetId: 'loc-3' },
        ],
      });
      const input = createMockInput({
        intent: { type: 'move', params: {}, confidence: 1 },
        stateSlices: { location },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('north');
      expect(result.narrative).toContain('east');
    });
  });

  describe('look handling', () => {
    it('describes location on general look', async () => {
      const location = createMockLocation();
      const input = createMockInput({
        intent: createLookIntent(),
        stateSlices: { location },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('Test Location');
    });

    it('uses knowledge context for target look', async () => {
      const location = createMockLocation();
      const input = createMockInput({
        intent: createLookIntent('sword'),
        stateSlices: { location },
        knowledgeContext: [{ path: 'items.sword', content: 'A gleaming silver sword', score: 0.9 }],
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('gleaming silver sword');
    });

    it('returns generic response when target not found', async () => {
      const location = createMockLocation();
      const input = createMockInput({
        intent: createLookIntent('dragon'),
        stateSlices: { location },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain("don't see anything noteworthy");
    });
  });

  describe('diagnostics', () => {
    it('includes execution time', async () => {
      const input = createMockInput();
      const result = await agent.execute(input);

      expect(result.diagnostics?.executionTimeMs).toBeDefined();
      expect(result.diagnostics?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
