import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { FirstImpressionGenerator } from '../first-impression.js';

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

describe('studio-npc/first-impression', () => {
  it('splits external perception and internal reaction', async () => {
    const provider = createMockProvider('They see a confident leader, but inside you are uneasy.');
    const generator = new FirstImpressionGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      { context: 'tavern' }
    );

    expect(response.externalPerception).toContain('They see a confident leader');
    expect(response.internalReaction).toContain('inside you are uneasy');
  });

  it('returns a safe fallback on failures', async () => {
    const provider = createMockProvider('', true);
    const generator = new FirstImpressionGenerator(provider);

    const response = await generator.generate(
      { name: 'Elara' } as CharacterProfile,
      { context: 'tavern' }
    );

    expect(response.externalPerception).toBe('[Unable to generate first impression]');
    expect(response.internalReaction).toBe('');
  });
});
