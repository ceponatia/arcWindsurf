import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import type { LLMMessage } from '../src/types.js';

const { createMock, ctorMock, OpenAIStub } = vi.hoisted(() => {
  const createMock = vi.fn();
  const ctorMock = vi.fn();

  class OpenAIStub {
    public chat = { completions: { create: createMock } };
    constructor(config: unknown) {
      ctorMock(config);
    }
  }

  return { createMock, ctorMock, OpenAIStub };
});

vi.mock('openai', () => ({
  OpenAI: OpenAIStub,
}));

import { OllamaProvider } from '../src/providers/ollama.js';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps tool messages to assistant role', async () => {
    createMock.mockResolvedValueOnce({
      id: 'resp-1',
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const provider = new OllamaProvider({ id: 'ollama', model: 'llama' });

    const messages: LLMMessage[] = [
      { role: 'tool', content: 'tool output' },
      { role: 'user', content: 'Hi' },
    ];

    await Effect.runPromise(provider.chat(messages));

    const body = createMock.mock.calls[0]?.[0] as { messages?: Array<{ role: string }> } | undefined;
    expect(body?.messages?.[0]?.role).toBe('assistant');
  });

  it('uses default baseURL when not provided', async () => {
    new OllamaProvider({ id: 'ollama', model: 'llama' });

    const config = ctorMock.mock.calls[0]?.[0] as { baseURL?: string } | undefined;
    expect(config?.baseURL).toBe('http://localhost:11434/v1');
  });
});
