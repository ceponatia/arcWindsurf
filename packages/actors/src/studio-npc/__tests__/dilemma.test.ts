import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import { DilemmaEngine } from '../dilemma.js';
import type { Dilemma } from '../types.js';

function createMockProvider(content: string): LLMProvider {
  return {
    id: 'mock',
    supportsTools: false,
    supportsFunctions: false,
    chat: () => Effect.succeed({ id: 'resp', content } as LLMResponse),
    stream: () =>
      Effect.succeed(
        (async function* empty(): AsyncGenerator<LLMStreamChunk> {
          // not used
        })()
      ),
  } satisfies LLMProvider;
}

describe('studio-npc/dilemma', () => {
  it('selects a template that matches known values', async () => {
    const engine = new DilemmaEngine({ llmProvider: createMockProvider('[]') });
    const profile: Partial<CharacterProfile> = {
      personalityMap: {
        values: [{ value: 'loyalty', priority: 9 }],
      },
    };

    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const dilemma = await engine.generateDilemma(profile);

    expect(dilemma.conflictingValues).toEqual(['loyalty', 'honesty']);
    expect(dilemma.scenario).toContain('Your closest friend has committed a crime');

    mathSpy.mockRestore();
  });

  it('parses custom dilemmas from LLM responses', async () => {
    const provider = createMockProvider(JSON.stringify({
      scenario: 'A custom scenario',
      conflictingValues: ['truth', 'mercy'],
      targetTraits: ['personalityMap.values'],
    }));
    const engine = new DilemmaEngine({ llmProvider: provider });

    const dilemma = await engine.generateCustomDilemma({ name: 'Elara' }, ['truth', 'mercy']);

    expect(dilemma.scenario).toBe('A custom scenario');
    expect(dilemma.conflictingValues).toEqual(['truth', 'mercy']);
  });

  it('falls back to templates when custom generation fails', async () => {
    const provider = createMockProvider('not-json');
    const engine = new DilemmaEngine({ llmProvider: provider });

    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const dilemma = await engine.generateCustomDilemma({ name: 'Elara' });

    expect(dilemma.conflictingValues.length).toBe(2);
    expect(dilemma.scenario.length).toBeGreaterThan(0);

    mathSpy.mockRestore();
  });

  it('parses value signals from analysis and returns empty on failures', async () => {
    const provider = createMockProvider(JSON.stringify([
      { value: 'justice', priority: 8, evidence: 'She insists on fairness.' },
    ]));
    const engine = new DilemmaEngine({ llmProvider: provider });

    const dilemma: Dilemma = {
      id: 'd-1',
      scenario: 'A test scenario',
      conflictingValues: ['justice', 'mercy'],
      targetTraits: ['personalityMap.values'],
    };

    const signals = await engine.analyzeResponse(dilemma, 'Response text');

    expect(signals).toHaveLength(1);
    expect(signals[0]?.value).toBe('justice');

    const failingEngine = new DilemmaEngine({ llmProvider: createMockProvider('invalid') });
    const empty = await failingEngine.analyzeResponse(dilemma, 'Response text');
    expect(empty).toEqual([]);
  });

  it('builds character prompts with conflicting values', () => {
    const engine = new DilemmaEngine({ llmProvider: createMockProvider('[]') });
    const dilemma: Dilemma = {
      id: 'd-2',
      scenario: 'Choose between A and B.',
      conflictingValues: ['honor', 'survival'],
      targetTraits: ['personalityMap.values'],
    };

    const prompt = engine.buildCharacterPrompt(dilemma);

    expect(prompt).toContain('Choose between A and B.');
    expect(prompt).toContain('honor against survival');
  });
});
