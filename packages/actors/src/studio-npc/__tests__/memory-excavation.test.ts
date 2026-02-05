import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { MemoryExcavator } from '../memory-excavation.js';

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

describe('studio-npc/memory-excavation', () => {
  it('extracts backstory elements with suggested integration', async () => {
    const provider = createMockProvider(
      'I remember the old river in spring, the smell of rain on stone. It was the day I chose to leave home forever.'
    );
    const excavator = new MemoryExcavator(provider);

    const result = await excavator.excavate(
      { name: 'Elara' } as CharacterProfile,
      'proudest-moment'
    );

    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.elements[0]?.suggestedIntegration).toBe('achievements or defining moments');
  });

  it('returns a safe fallback on failure', async () => {
    const provider = createMockProvider('', true);
    const excavator = new MemoryExcavator(provider);

    const result = await excavator.excavate(
      { name: 'Elara' } as CharacterProfile,
      'earliest-memory'
    );

    expect(result.memory).toBe('[Unable to excavate memory]');
    expect(result.elements).toEqual([]);
  });
});
