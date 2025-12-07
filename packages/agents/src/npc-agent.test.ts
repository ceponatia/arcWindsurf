import { describe, it, expect } from 'vitest';
import { NpcAgent } from './npc-agent.js';
import type { AgentInput, AgentIntent, CharacterSlice, IntentSegment } from './types.js';

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
    goals: ['Find the ancient artifact'],
    personality: ['brave', 'curious'],
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

function createNarrateIntent(
  narrateType?: 'action' | 'thought' | 'emote' | 'narrative'
): AgentIntent {
  return {
    type: 'narrate',
    params: narrateType ? { narrateType } : {},
    confidence: 1,
  };
}

function createCompoundIntent(segments: IntentSegment[]): AgentIntent {
  // Primary type should be 'talk' if there's speech, else 'narrate'
  const hasTalk = segments.some((s) => s.type === 'talk');
  return {
    type: hasTalk ? 'talk' : 'narrate',
    params: {},
    confidence: 0.9,
    segments,
  };
}

describe('NpcAgent', () => {
  const agent = new NpcAgent();

  describe('canHandle', () => {
    it('handles talk intents', () => {
      expect(agent.canHandle(createTalkIntent())).toBe(true);
    });

    it('handles narrate intents', () => {
      expect(agent.canHandle(createNarrateIntent('action'))).toBe(true);
      expect(agent.canHandle(createNarrateIntent('thought'))).toBe(true);
      expect(agent.canHandle(createNarrateIntent('emote'))).toBe(true);
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

    it('handles compound intents with segments', async () => {
      const character = createMockCharacter();
      const segments: IntentSegment[] = [
        { type: 'action', content: 'He sits up' },
        { type: 'talk', content: "Wow, I didn't realize that." },
        { type: 'emote', content: 'feels a bit embarrassed' },
      ];
      const input = createMockInput({
        playerInput: "*He sits up* Wow, I didn't realize that. *feels a bit embarrassed*",
        intent: createCompoundIntent(segments),
        stateSlices: { character },
      });

      const result = await agent.execute(input);

      // Template mode will still produce a valid response
      expect(result.narrative).toContain('Aria');
    });

    it('handles thought narrate type without revealing thoughts', async () => {
      const character = createMockCharacter();
      const input = createMockInput({
        playerInput: '*wonders if she noticed*',
        intent: createNarrateIntent('thought'),
        stateSlices: { character },
      });

      const result = await agent.execute(input);

      // Should produce a response without explicitly knowing the thought
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
