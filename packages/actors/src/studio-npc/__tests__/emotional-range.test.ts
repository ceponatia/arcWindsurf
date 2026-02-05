import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { EmotionalRangeGenerator } from '../emotional-range.js';

function createMockProvider(responses: string[], shouldFail = false): LLMProvider {
  let index = 0;
  return {
    id: 'mock',
    supportsTools: false,
    supportsFunctions: false,
    chat: () => {
      if (shouldFail) {
        return Effect.fail(new Error('boom'));
      }
      return Effect.succeed({ id: `resp-${index}`, content: responses[index++] ?? '' } as LLMResponse);
    },
    stream: () =>
      Effect.succeed(
        (async function* empty(): AsyncGenerator<LLMStreamChunk> {
          // not used
        })()
      ),
  } satisfies LLMProvider;
}

describe('studio-npc/emotional-range', () => {
  it('returns variations for each requested emotion', async () => {
    const provider = createMockProvider(['Happy response', 'Sad response']);
    const generator = new EmotionalRangeGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      { basePrompt: 'How do you respond?', emotions: ['happy', 'sad'] }
    );

    expect(response.variations).toHaveLength(2);
    expect(response.variations[0]?.emotion).toBe('happy');
  });

  it('falls back when LLM generation fails', async () => {
    const provider = createMockProvider([], true);
    const generator = new EmotionalRangeGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      { basePrompt: 'How do you respond?', emotions: ['happy', 'sad'] }
    );

    expect(response.variations[0]?.response).toBe('[Unable to generate response]');
  });

  it('infers expressiveness from response variation length', async () => {
    const provider = createMockProvider([
      'Short response.',
      'A much longer response that should create more variance in length for testing.',
    ]);
    const generator = new EmotionalRangeGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      { basePrompt: 'How do you respond?', emotions: ['happy', 'sad'] }
    );

    expect(response.inferredRange.value).toBeGreaterThan(0);
  });
});
