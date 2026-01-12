import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { Effect } from 'effect';

import {
  registerStudioRoutes,
  type RegisterStudioRoutesOptions,
  type StudioLlmProvider,
} from '../../src/routes/studio.js';
import type { LLMStreamChunk, LLMResponse } from '@minimal-rpg/llm';

class HttpError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function makeApp(options?: RegisterStudioRoutesOptions): Hono {
  const app = new Hono();
  registerStudioRoutes(app, options);
  return app;
}

function okProvider(responseContent: string): StudioLlmProvider {
  async function* emptyStream(): AsyncGenerator<LLMStreamChunk> {
    // Not used in these tests.
  }

  const response: LLMResponse = {
    id: 'test',
    content: responseContent,
    tool_calls: null,
    usage: null,
  };

  return {
    chat: () => Effect.succeed(response),
    stream: () =>
      Effect.succeed(emptyStream()),
  };
}

function failingProvider(error: Error): StudioLlmProvider {
  return {
    chat: () => Effect.fail(error),
    stream: () => Effect.fail(error),
  };
}

describe('routes/studio error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Missing API key returns 503 with CONFIG_ERROR (+ retryable=false)', async () => {
    const app = makeApp({ llmProvider: null });

    const resGenerate = await app.request('/studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {}, history: [], userMessage: 'Hello' }),
    });

    expect(resGenerate.status).toBe(503);
    await expect(resGenerate.json()).resolves.toMatchObject({
      ok: false,
      code: 'CONFIG_ERROR',
      retryable: false,
    });

    const resInfer = await app.request('/studio/infer-traits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: 'Hello', characterResponse: 'Hi', currentProfile: {} }),
    });

    expect(resInfer.status).toBe(503);
    await expect(resInfer.json()).resolves.toMatchObject({
      ok: false,
      code: 'CONFIG_ERROR',
      retryable: false,
    });

    const resStream = await app.request('/studio/generate/stream');
    expect(resStream.status).toBe(503);
    await expect(resStream.json()).resolves.toMatchObject({
      ok: false,
      code: 'CONFIG_ERROR',
      retryable: false,
    });
  });

  it('Rate limit returns 429 with RATE_LIMITED (+ retryable=true) and logs context', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const app = makeApp({ llmProvider: failingProvider(new HttpError('rate limit', 429)) });

    const res = await app.request('/studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {}, history: [], userMessage: 'Hello' }),
    });

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
      retryable: true,
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.some((c) => String(c[0]).includes('Studio generate error:'))).toBe(true);
  });

  it('Timeout returns 504 with TIMEOUT (+ retryable=true) and logs context', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const app = makeApp({ llmProvider: failingProvider(new HttpError('timeout', 504)) });

    const res = await app.request('/studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {}, history: [], userMessage: 'Hello' }),
    });

    expect(res.status).toBe(504);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      code: 'TIMEOUT',
      retryable: true,
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.some((c) => String(c[0]).includes('Studio generate error:'))).toBe(true);
  });

  it('Other LLM errors return 502 with LLM_UNAVAILABLE (+ retryable=true) and logs context', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const app = makeApp({ llmProvider: failingProvider(new Error('boom')) });

    const res = await app.request('/studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {}, history: [], userMessage: 'Hello' }),
    });

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      code: 'LLM_UNAVAILABLE',
      retryable: true,
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.some((c) => String(c[0]).includes('Studio generate error:'))).toBe(true);
  });

  it('Parse errors in infer-traits return empty array (graceful)', async () => {
    const app = makeApp({ llmProvider: okProvider('{') });

    const res = await app.request('/studio/infer-traits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: 'Hello', characterResponse: 'Hi', currentProfile: {} }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ traits: [] });
  });

  it('Infer-traits rate limits return 429 with RATE_LIMITED (+ retryable=true) and logs context', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const app = makeApp({ llmProvider: failingProvider(new HttpError('rate limit', 429)) });

    const res = await app.request('/studio/infer-traits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: 'Hello', characterResponse: 'Hi', currentProfile: {} }),
    });

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
      retryable: true,
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.some((c) => String(c[0]).includes('Infer traits LLM error:'))).toBe(true);
  });

  it('Infer-traits LLM parse errors degrade to empty array (graceful)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const app = makeApp({ llmProvider: failingProvider(new Error('parse error')) });

    const res = await app.request('/studio/infer-traits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: 'Hello', characterResponse: 'Hi', currentProfile: {} }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ traits: [] });

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.some((c) => String(c[0]).includes('Infer traits LLM error:'))).toBe(true);
  });
});
