import { describe, it, expect, vi } from 'vitest';
import { SensoryAgent } from '../sensory-agent.js';
import type {
  AgentInput,
  AgentIntent,
  CharacterSlice,
  KnowledgeContextItem,
} from '../../core/types.js';

function createMockInput(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    sessionId: 'test-session',
    playerInput: 'I sniff the air',
    stateSlices: {},
    ...overrides,
  };
}

function createMockCharacter(overrides: Partial<CharacterSlice> = {}): CharacterSlice {
  return {
    instanceId: 'char-1',
    name: 'Mira',
    goals: ['Uncover ancient secrets'],
    personality: ['enigmatic', 'graceful'],
    ...overrides,
  };
}

function createSmellIntent(target?: string): AgentIntent {
  return {
    type: 'smell',
    params: target ? { target } : {},
    confidence: 1,
  };
}

function createScentKnowledge(scents: {
  hairScent?: string;
  bodyScent?: string;
  perfume?: string;
}): KnowledgeContextItem[] {
  const items: KnowledgeContextItem[] = [];

  if (scents.hairScent) {
    items.push({
      path: 'scent.hairScent',
      content: scents.hairScent,
      score: 0.9,
      source: 'character',
    });
  }

  if (scents.bodyScent) {
    items.push({
      path: 'scent.bodyScent',
      content: scents.bodyScent,
      score: 0.85,
      source: 'character',
    });
  }

  if (scents.perfume) {
    items.push({
      path: 'scent.perfume',
      content: scents.perfume,
      score: 0.88,
      source: 'character',
    });
  }

  return items;
}

describe('SensoryAgent', () => {
  describe('canHandle', () => {
    const agent = new SensoryAgent();

    it('handles smell intents', () => {
      expect(agent.canHandle(createSmellIntent())).toBe(true);
    });

    it('handles taste intents', () => {
      const intent: AgentIntent = { type: 'taste', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(true);
    });

    it('handles touch intents', () => {
      const intent: AgentIntent = { type: 'touch', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(true);
    });

    it('handles listen intents', () => {
      const intent: AgentIntent = { type: 'listen', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(true);
    });

    it('does not handle talk intents', () => {
      const intent: AgentIntent = { type: 'talk', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(false);
    });

    it('does not handle move intents', () => {
      const intent: AgentIntent = { type: 'move', params: {}, confidence: 1 };
      expect(agent.canHandle(intent)).toBe(false);
    });
  });

  describe('smell intent', () => {
    const agent = new SensoryAgent({ allowInference: false });

    it('returns empty narrative when no character and no LLM', async () => {
      const input = createMockInput({
        intent: createSmellIntent(),
      });
      const result = await agent.execute(input);

      // Should silently ignore - empty narrative
      expect(result.narrative).toBe('');
      expect(result.diagnostics?.warnings).toBeDefined();
      expect(result.diagnostics?.warnings?.[0]).toContain('ignored');
    });

    it('returns empty narrative when character exists but no scent data', async () => {
      const character = createMockCharacter();
      const input = createMockInput({
        intent: createSmellIntent('Mira'),
        stateSlices: { npc: character },
      });
      const result = await agent.execute(input);

      // Should silently ignore - no scent data
      expect(result.narrative).toBe('');
      expect(result.diagnostics?.debug).toMatchObject({ ignored: true });
    });

    it('generates template narrative when scent data exists (no LLM)', async () => {
      const character = createMockCharacter();
      const knowledgeContext = createScentKnowledge({
        hairScent: 'a faint lavender scent',
        perfume: 'notes of jasmine and vanilla',
      });

      const input = createMockInput({
        intent: createSmellIntent('Mira'),
        playerInput: "I lean in to smell Mira's hair",
        stateSlices: { npc: character },
        knowledgeContext,
      });

      const result = await agent.execute(input);

      // Should generate a narrative from the scent data
      expect(result.narrative).not.toBe('');
      expect(result.narrative.toLowerCase()).toMatch(/mira|lavender|jasmine/i);
      expect(result.diagnostics?.debug).toMatchObject({ source: 'template' });
    });

    it('includes all available scent types in template', async () => {
      const character = createMockCharacter();
      const knowledgeContext = createScentKnowledge({
        hairScent: 'fresh mint',
        bodyScent: 'clean soap',
        perfume: 'rose water',
      });

      const input = createMockInput({
        intent: createSmellIntent('Mira'),
        stateSlices: { npc: character },
        knowledgeContext,
      });

      const result = await agent.execute(input);

      // Should include content from scent data
      expect(result.narrative).not.toBe('');
    });
  });

  describe('TBD intents', () => {
    const agent = new SensoryAgent();

    it('ignores taste intent (TBD)', async () => {
      const input = createMockInput({
        intent: { type: 'taste', params: {}, confidence: 1 },
      });
      const result = await agent.execute(input);

      expect(result.narrative).toBe('');
      expect(result.diagnostics?.warnings?.[0]).toContain('TBD');
    });

    it('ignores touch intent (TBD)', async () => {
      const input = createMockInput({
        intent: { type: 'touch', params: {}, confidence: 1 },
      });
      const result = await agent.execute(input);

      expect(result.narrative).toBe('');
      expect(result.diagnostics?.warnings?.[0]).toContain('TBD');
    });

    it('ignores listen intent (TBD)', async () => {
      const input = createMockInput({
        intent: { type: 'listen', params: {}, confidence: 1 },
      });
      const result = await agent.execute(input);

      expect(result.narrative).toBe('');
      expect(result.diagnostics?.warnings?.[0]).toContain('TBD');
    });
  });

  describe('target resolution', () => {
    const agent = new SensoryAgent({ allowInference: false });

    it('targets NPC when target name matches NPC', async () => {
      const npc = createMockCharacter({ name: 'Elara' });
      const knowledgeContext = createScentKnowledge({
        perfume: 'exotic spices',
      });

      const input = createMockInput({
        intent: createSmellIntent('Elara'),
        stateSlices: { npc },
        knowledgeContext,
      });

      const result = await agent.execute(input);

      expect(result.narrative).toContain('Elara');
    });

    it('uses NPC slice when no explicit target but NPC present', async () => {
      const npc = createMockCharacter({ name: 'Theron' });
      const knowledgeContext = createScentKnowledge({
        bodyScent: 'woodsmoke and leather',
      });

      const input = createMockInput({
        intent: createSmellIntent(), // no target
        stateSlices: { npc },
        knowledgeContext,
      });

      const result = await agent.execute(input);

      // Should use the NPC since it's present
      expect(result.narrative).not.toBe('');
    });

    it('allows smelling self when target is "self"', async () => {
      const character = createMockCharacter({ name: 'Player' });
      const knowledgeContext = createScentKnowledge({
        perfume: 'light citrus',
      });

      const input = createMockInput({
        intent: createSmellIntent('self'),
        stateSlices: { character },
        knowledgeContext,
      });

      const result = await agent.execute(input);

      expect(result.narrative).not.toBe('');
    });
  });

  describe('LLM integration', () => {
    it('uses LLM when available and scent data exists', async () => {
      const mockLlmProvider = {
        generate: vi.fn().mockResolvedValue({
          text: 'The subtle aroma of lavender mingles with something floral.',
          usage: { prompt: 100, completion: 20, total: 120 },
        }),
      };

      const agent = new SensoryAgent({ llmProvider: mockLlmProvider });
      const character = createMockCharacter();
      const knowledgeContext = createScentKnowledge({
        hairScent: 'lavender',
      });

      const input = createMockInput({
        intent: createSmellIntent('Mira'),
        stateSlices: { npc: character },
        knowledgeContext,
      });

      const result = await agent.execute(input);

      expect(mockLlmProvider.generate).toHaveBeenCalled();
      expect(result.narrative).toContain('lavender');
      expect(result.diagnostics?.tokenUsage).toBeDefined();
    });

    it('falls back to template when LLM fails', async () => {
      const mockLlmProvider = {
        generate: vi.fn().mockRejectedValue(new Error('API error')),
      };

      const agent = new SensoryAgent({ llmProvider: mockLlmProvider });
      const character = createMockCharacter();
      const knowledgeContext = createScentKnowledge({
        perfume: 'rose essence',
      });

      const input = createMockInput({
        intent: createSmellIntent('Mira'),
        stateSlices: { npc: character },
        knowledgeContext,
      });

      const result = await agent.execute(input);

      // Should fall back to template, not fail
      expect(result.narrative).not.toBe('');
      expect(result.diagnostics?.debug).toMatchObject({ source: 'template' });
    });
  });

  describe('inference mode', () => {
    it('attempts inference when no scent data but allowInference is true', async () => {
      const mockLlmProvider = {
        generate: vi.fn().mockResolvedValue({
          text: 'A hint of pine and mountain air clings to the ranger.',
          usage: { prompt: 150, completion: 25, total: 175 },
        }),
      };

      const agent = new SensoryAgent({
        llmProvider: mockLlmProvider,
        allowInference: true,
      });

      const character = createMockCharacter({
        name: 'Ranger',
      });

      const input = createMockInput({
        intent: createSmellIntent('Ranger'),
        stateSlices: { npc: character },
        // No scent knowledge context
      });

      const result = await agent.execute(input);

      expect(mockLlmProvider.generate).toHaveBeenCalled();
      expect(result.diagnostics?.debug?.['source']).toBe('llm-inference');
    });

    it('ignores when LLM returns NO_INFERENCE marker', async () => {
      const mockLlmProvider = {
        generate: vi.fn().mockResolvedValue({
          text: '[NO_INFERENCE]',
          usage: { prompt: 150, completion: 5, total: 155 },
        }),
      };

      const agent = new SensoryAgent({
        llmProvider: mockLlmProvider,
        allowInference: true,
      });

      const character = createMockCharacter();
      const input = createMockInput({
        intent: createSmellIntent('Mira'),
        stateSlices: { npc: character },
      });

      const result = await agent.execute(input);

      expect(result.narrative).toBe('');
      expect(result.diagnostics?.warnings?.[0]).toContain('could not infer');
    });
  });
});
