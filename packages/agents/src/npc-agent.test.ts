import { describe, it, expect } from 'vitest';
import { NpcAgent } from './npc-agent.js';
import type { AgentInput, AgentIntent, CharacterSlice } from './types.js';

function createMockInput(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    sessionId: 'test-session',
    playerInput: 'Hello there!',
    stateSlices: {},
    ...overrides,
  };
}

function createMockCharacter(overrides: Partial<CharacterSlice> = {}): CharacterSlice {
  return {
    instanceId: 'char-1',
    name: 'Aria',
    summary: 'A brave adventurer seeking glory.',
    goals: ['Find the ancient artifact'],
    personalityTraits: ['brave', 'curious'],
    ...overrides,
  };
}

function createTalkIntent(target?: string): AgentIntent {
  return {
    type: 'talk',
    params: target ? { target } : {},
    confidence: 1,
  };
}

describe('NpcAgent', () => {
  const agent = new NpcAgent();

  describe('canHandle', () => {
    it('handles talk intents', () => {
      expect(agent.canHandle(createTalkIntent())).toBe(true);
    });

    it('does not handle move intents', () => {
      const intent: AgentIntent = { type: 'move', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(false);
    });
  });

  describe('execute', () => {
    it('returns no one here when no character', async () => {
      const input = createMockInput();
      const result = await agent.execute(input);

      expect(result.narrative).toContain('no one here');
      expect(result.diagnostics?.warnings).toContain('No character data available');
    });

    it('generates template dialogue when character exists', async () => {
      const character = createMockCharacter();
      const input = createMockInput({
        stateSlices: { character },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('Aria');
    });

    it('uses knowledge context in response', async () => {
      const character = createMockCharacter();
      const input = createMockInput({
        stateSlices: { character },
        knowledgeContext: [
          { path: 'backstory', content: 'Aria grew up in the mountains', score: 0.9 },
        ],
      });

      const result = await agent.execute(input);

      expect(result.narrative).toBeDefined();
    });
  });

  describe('diagnostics', () => {
    it('includes execution time', async () => {
      const character = createMockCharacter();
      const input = createMockInput({
        stateSlices: { character },
      });

      const result = await agent.execute(input);

      expect(result.diagnostics?.executionTimeMs).toBeDefined();
      expect(result.diagnostics?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
