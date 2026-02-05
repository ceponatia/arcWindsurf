import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import { OpenAIProvider, createOpenRouterProviderFromEnv } from '../src/providers/openai.js';

describe('OpenAIProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('maps tool calls and usage in chat responses', async () => {
    createMock.mockResolvedValueOnce({
      id: 'resp-1',
      choices: [
        {
          message: {
            content: 'Hello',
            tool_calls: [
              {
                id: 'tool-1',
                type: 'function',
                function: { name: 'doThing', arguments: '{"a":1}' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });

    const provider = new OpenAIProvider({
      id: 'openai',
      apiKey: 'key',
      model: 'gpt',
    });

    const result = await Effect.runPromise(provider.chat([{ role: 'user', content: 'Hi' }]));

    expect(result).toEqual({
      id: 'resp-1',
      content: 'Hello',
      tool_calls: [
        {
          id: 'tool-1',
          type: 'function',
          function: { name: 'doThing', arguments: '{"a":1}' },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });
  });

  it('throws when response has no choices', async () => {
    createMock.mockResolvedValueOnce({ id: 'resp-2', choices: [] });

    const provider = new OpenAIProvider({
      id: 'openai',
      apiKey: 'key',
      model: 'gpt',
    });

    await expect(Effect.runPromise(provider.chat([{ role: 'user', content: 'Hi' }])))
      .rejects.toThrow('No choice in response');
  });

  it('streams and passes provider routing when configured', async () => {
    async function* stream() {
      yield { choices: [{ delta: { content: 'hi' } }] };
    }

    createMock.mockResolvedValueOnce(stream());

    const provider = new OpenAIProvider({
      id: 'openai',
      apiKey: 'key',
      model: 'gpt',
      providerRouting: { sort: 'price' },
    });

    const result = await Effect.runPromise(provider.stream([{ role: 'user', content: 'Hi' }]));

    const body = createMock.mock.calls[0]?.[0] as { provider?: { sort?: string }; stream?: boolean } | undefined;
    expect(body?.provider?.sort).toBe('price');
    expect(body?.stream).toBe(true);

    const iterator = result[Symbol.asyncIterator]();
    const first = await iterator.next();
    expect(first.value).toEqual({ choices: [{ delta: { content: 'hi' } }] });
  });

  it('creates provider from env when key present', async () => {
    process.env.OPENROUTER_API_KEY = 'key';
    process.env.OPENROUTER_MODEL = 'model-1';
    process.env.OPENROUTER_BASE_URL = 'https://example.com';
    process.env.OPENROUTER_PROVIDER_SORT = 'throughput';

    createMock.mockResolvedValueOnce({
      id: 'resp-3',
      choices: [{ message: { content: 'ok' } }],
    });

    const provider = createOpenRouterProviderFromEnv({ id: 'router' });
    expect(provider).toBeTruthy();

    await Effect.runPromise(provider!.chat([{ role: 'user', content: 'Hi' }]));

    const body = createMock.mock.calls[0]?.[0] as { model?: string; provider?: { sort?: string } } | undefined;
    expect(body?.model).toBe('model-1');
    expect(body?.provider?.sort).toBe('throughput');
  });

  it('returns null when openrouter key is missing', () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = createOpenRouterProviderFromEnv();
    expect(provider).toBeNull();
  });

  it('includes tool role mapping in request payload', async () => {
    createMock.mockResolvedValueOnce({
      id: 'resp-4',
      choices: [{ message: { content: 'ok' } }],
    });

    const provider = new OpenAIProvider({
      id: 'openai',
      apiKey: 'key',
      model: 'gpt',
    });

    const messages: LLMMessage[] = [
      { role: 'tool', content: 'result', tool_call_id: 'call-1' },
      { role: 'user', content: 'Hi' },
    ];

    await Effect.runPromise(provider.chat(messages));

    const body = createMock.mock.calls[0]?.[0] as { messages?: Array<{ role: string; tool_call_id?: string }> } | undefined;
    expect(body?.messages?.[0]?.role).toBe('tool');
    expect(body?.messages?.[0]?.tool_call_id).toBe('call-1');
  });
});
