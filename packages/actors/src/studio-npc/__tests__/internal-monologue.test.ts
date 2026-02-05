import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { InternalMonologueGenerator } from '../internal-monologue.js';

function createMockProvider(content: string, shouldFail = false): LLMProvider {
  return {
    id: 'mock',
    supportsTools: false,
    supportsFunctions: false,
    chat: () => {
      if (shouldFail) {
        return Effect.fail(new Error('boom'));
      }
      return Effect.succeed({ id: 'resp', content } as LLMResponse);
    },
    stream: () =>
      Effect.succeed(
        (async function* empty(): AsyncGenerator<LLMStreamChunk> {
          // not used
        })()
      ),
  } satisfies LLMProvider;
}

describe('studio-npc/internal-monologue', () => {
  it('parses JSON responses with spoken and thought fields', async () => {
    const provider = createMockProvider(JSON.stringify({
      spoken: 'I am calm.',
      thought: 'I am worried inside.',
    }));
    const generator = new InternalMonologueGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      'How are you?'
    );

    expect(response.spoken).toBe('I am calm.');
    expect(response.thought).toBe('I am worried inside.');
  });

  it('falls back to spoken-only responses when JSON is invalid', async () => {
    const provider = createMockProvider('Plain response.');
    const generator = new InternalMonologueGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      'How are you?'
    );

    expect(response.spoken).toBe('Plain response.');
    expect(response.thought).toBe('');
  });

  it('returns a safe fallback on failures', async () => {
    const provider = createMockProvider('', true);
    const generator = new InternalMonologueGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      'How are you?'
    );

    expect(response.spoken).toBe('[Unable to generate internal monologue]');
  });
});
