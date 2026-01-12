import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import { Hono } from 'hono';

import type { LLMMessage, LLMStreamChunk, LLMResponse } from '@minimal-rpg/llm';
import { registerStudioRoutes, type StudioLlmProvider } from '../../src/routes/studio.js';
import { collectSseEvents } from '../utils/sse.js';

function buildUrl(params: { profile: unknown; history: unknown; userMessage: string }): string {
  const url = new URL('http://local.test/studio/generate/stream');
  url.searchParams.set('profile', JSON.stringify(params.profile));
  url.searchParams.set('history', JSON.stringify(params.history));
  url.searchParams.set('userMessage', params.userMessage);
  return url.pathname + url.search;
}

function createTestApp(llmProvider: StudioLlmProvider | null): Hono {
  const app = new Hono();
  registerStudioRoutes(app, { llmProvider });
  return app;
}

function createStreamingProvider(chunks: string[]): StudioLlmProvider {
  return {
    chat(_messages: LLMMessage[]): Effect.Effect<LLMResponse, Error> {
      return Effect.succeed({ id: 'test', content: null, tool_calls: null, usage: null });
    },
    stream(_messages: LLMMessage[]): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error> {
      async function* gen(): AsyncGenerator<LLMStreamChunk> {
        for (const content of chunks) {
          yield { choices: [{ delta: { content } }] } as unknown as LLMStreamChunk;
        }
      }

      return Effect.succeed(gen());
    },
  } satisfies StudioLlmProvider;
}

function createFailingStreamProvider(message: string): StudioLlmProvider {
  return {
    chat(_messages: LLMMessage[]): Effect.Effect<LLMResponse, Error> {
      return Effect.succeed({ id: 'test', content: null, tool_calls: null, usage: null });
    },
    stream(_messages: LLMMessage[]): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error> {
      return Effect.fail(new Error(message));
    },
  } satisfies StudioLlmProvider;
}

describe('routes/studio GET /studio/generate/stream', () => {
  it('streams content chunks as SSE events and completes with done', async () => {
    const app = createTestApp(createStreamingProvider(['Hello', ' ', 'world']));

    const res = await app.request(
      buildUrl({ profile: {}, history: [], userMessage: 'hi' }),
      {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') ?? '').toContain('text/event-stream');

    expect(res.body).toBeTruthy();
    const events = await collectSseEvents(res.body!);

    const contentEvents = events.filter((e) => e.event === 'content');
    expect(contentEvents.length).toBeGreaterThanOrEqual(2);

    const combined = contentEvents
      .map((e) => JSON.parse(e.data) as { content?: string })
      .map((p) => p.content ?? '')
      .join('');

    expect(combined).toBe('Hello world');

    const last = events.at(-1);
    expect(last).toBeTruthy();
    if (!last) throw new Error('missing terminal SSE event');
    expect(last.event).toBe('done');
    expect(JSON.parse(last.data)).toEqual({ done: true });
  });

  it('emits error and then done when provider streaming fails (graceful close)', async () => {
    const app = createTestApp(createFailingStreamProvider('boom'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await app.request(buildUrl({ profile: {}, history: [], userMessage: 'hi' }), {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') ?? '').toContain('text/event-stream');

    expect(res.body).toBeTruthy();
    const events = await collectSseEvents(res.body!);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const matchingCall = consoleErrorSpy.mock.calls.find((call) => {
      const first = String(call[0] ?? '');
      const second = String(call[1] ?? '');
      return first.includes('Generate stream error:') && second.includes('boom');
    });
    expect(matchingCall).toBeTruthy();

    consoleErrorSpy.mockRestore();

    const errorEvent = events.find((e) => e.event === 'error');
    expect(errorEvent).toBeTruthy();
    expect(JSON.parse(errorEvent!.data)).toEqual({ error: 'stream_failed', message: 'boom' });

    const last = events.at(-1);
    expect(last).toBeTruthy();
    if (!last) throw new Error('missing terminal SSE event');
    expect(last.event).toBe('done');
    expect(JSON.parse(last.data)).toEqual({ done: true });
  });

  it('returns 503 JSON when LLM provider is not configured', async () => {
    const app = createTestApp(null);

    const res = await app.request(
      buildUrl({ profile: {}, history: [], userMessage: 'hi' }),
      {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      }
    );

    expect(res.status).toBe(503);
    expect(res.headers.get('content-type') ?? '').toContain('application/json');

    const body = (await res.json()) as unknown;
    expect(body).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'CONFIG_ERROR',
      })
    );
  });
});
