import { describe, it, expect, vi, afterEach } from 'vitest';
import { chatWithOpenRouter, chatWithOpenRouterTools, generateWithOpenRouter } from '../src/llm/openrouter.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const okResponse = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

const errorResponse = (status: number, text: string) => ({
  ok: false,
  status,
  text: async () => text,
});

describe('openrouter', () => {
  it('returns assistant message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      okResponse({ choices: [{ message: { content: 'hi' } }] })
    ));

    const result = await chatWithOpenRouter({
      apiKey: 'key',
      model: 'model',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(result.message?.content).toBe('hi');
  });

  it('returns tool calls', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      okResponse({
        choices: [
          {
            message: {
              tool_calls: [
                { id: 't1', type: 'function', function: { name: 'tool', arguments: '{}' } },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      })
    ));

    const result = await chatWithOpenRouterTools({
      apiKey: 'key',
      model: 'model',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'tool',
            description: 'd',
            parameters: { type: 'object', properties: {} },
          },
        },
      ],
    });

    expect(result.tool_calls?.[0]?.id).toBe('t1');
  });

  it('handles errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => errorResponse(500, 'nope')));
    const result = await chatWithOpenRouter({
      apiKey: 'key',
      model: 'model',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(result.error).toContain('OpenRouter error 500');
  });

  it('generates normalized response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      okResponse({ choices: [{ message: { content: 'ok' } }] })
    ));

    const result = await generateWithOpenRouter({
      apiKey: 'key',
      model: 'model',
      messages: [{ role: 'user', content: 'hi' }],
    });

    if ('ok' in result) {
      throw new Error('Expected success');
    }

    expect(result.content).toBe('ok');
  });
});
