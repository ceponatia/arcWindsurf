import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import type { LLMProvider, LLMResponse } from '@minimal-rpg/llm';
import { VignetteGenerator } from '../vignettes.js';

const failingLlmProvider: LLMProvider = {
  id: 'failing-mock',
  supportsTools: false,
  supportsFunctions: false,
  chat: () => Effect.fail(new Error('boom')),
  stream: () => Effect.fail(new Error('boom')),
};

describe('Advanced feature fallbacks', () => {
  it('VignetteGenerator returns a safe fallback on LLM failure', async () => {
    const gen = new VignetteGenerator(failingLlmProvider);

    const res = await gen.generate(
      { name: 'Elara' },
      { archetype: 'stranger', scenario: 'first-meeting' }
    );

    expect(res.dialogue).toContain('[Unable to generate vignette]');
    expect(res.inferredPatterns).toEqual({});
  });

  it('VignetteGenerator still infers patterns when LLM succeeds', async () => {
    const okProvider: LLMProvider = {
      id: 'ok-mock',
      supportsTools: false,
      supportsFunctions: false,
      chat: () =>
        Effect.succeed({
          id: 'ok',
          content: 'Welcome, traveler. I am pleased to meet you.',
        } as LLMResponse),
      stream: () => Effect.fail(new Error('not-used')),
    };

    const gen = new VignetteGenerator(okProvider);
    const res = await gen.generate(
      { name: 'Elara' },
      { archetype: 'stranger', scenario: 'first-meeting' }
    );

    expect(res.dialogue).toContain('Welcome');
    expect(res.inferredPatterns.strangerDefault).toBe('welcoming');
  });
});
