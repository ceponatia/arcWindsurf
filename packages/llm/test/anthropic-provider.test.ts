import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import type { LLMMessage } from '../src/types.js';

const createMock = vi.fn();

class AnthropicStub {
  public messages = { create: createMock };
  constructor(_config: unknown) { }
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: AnthropicStub,
}));

import { AnthropicProvider } from '../src/providers/anthropic.js';

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('splits system message and extracts first text', async () => {
    createMock.mockResolvedValueOnce({
      id: 'resp-1',
      content: [{ type: 'text', text: 'Hello' }],
      usage: { input_tokens: 1, output_tokens: 2 },
    });

    const provider = new AnthropicProvider({ id: 'anthropic', apiKey: 'key', model: 'claude' });

    const messages: LLMMessage[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Hi' },
    ];

    const result = await Effect.runPromise(provider.chat(messages));

    const body = createMock.mock.calls[0]?.[0] as { system?: string; messages?: Array<{ role: string }> } | undefined;
    expect(body?.system).toBe('System prompt');
    expect(body?.messages?.length).toBe(1);

    expect(result).toEqual({
      id: 'resp-1',
      content: 'Hello',
      tool_calls: null,
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });
  });

  it('returns null content when no text blocks', async () => {
    createMock.mockResolvedValueOnce({
      id: 'resp-2',
      content: [{ type: 'image' }],
      usage: { input_tokens: 1, output_tokens: 0 },
    });

    const provider = new AnthropicProvider({ id: 'anthropic', apiKey: 'key', model: 'claude' });

    const result = await Effect.runPromise(provider.chat([{ role: 'user', content: 'Hi' }]));
    expect(result.content).toBeNull();
  });

  it('streams content deltas', async () => {
    async function* stream() {
      yield { type: 'content_block_delta', delta: { text: 'Hello' } };
      yield { type: 'message_delta', delta: { text: ' world' } };
    }

    createMock.mockResolvedValueOnce(stream());

    const provider = new AnthropicProvider({ id: 'anthropic', apiKey: 'key', model: 'claude' });
    const result = await Effect.runPromise(provider.stream([{ role: 'user', content: 'Hi' }]));

    const chunks: string[] = [];
    for await (const chunk of result) {
      chunks.push(chunk.choices[0]?.delta?.content ?? '');
    }

    expect(chunks.join('')).toBe('Hello world');
  });
});
