import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const streamMocks = vi.hoisted(() => ({
  subscribeMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  writeSseMock: vi.fn(),
  streamSSEMock: vi.fn(),
}));

let capturedHandler: ((event: Record<string, unknown>) => void) | null = null;

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    subscribe: (handler: (event: Record<string, unknown>) => void) => {
      capturedHandler = handler;
      streamMocks.subscribeMock(handler);
      return undefined;
    },
    unsubscribe: streamMocks.unsubscribeMock,
  },
}));

vi.mock('hono/streaming', () => ({
  streamSSE: streamMocks.streamSSEMock,
}));

const streamRouter = (await import('../../src/routes/stream.js')).default;

/**
 * Build a Hono app with stream routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  app.route('/stream', streamRouter);
  return app;
}

describe('routes/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedHandler = null;
    streamMocks.streamSSEMock.mockImplementation(async (_c, handler: (stream: { writeSSE: (payload: unknown) => Promise<void> | void }) => Promise<void>) => {
      const stream = {
        writeSSE: streamMocks.writeSseMock,
      };
      await handler(stream);
      return new Response(null, { status: 200 });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('streams events filtered by session id and cleans up on disconnect', async () => {
    vi.useFakeTimers();

    const app = makeApp();
    const controller = new AbortController();

    const requestPromise = app.request('/stream/session-1', {
      signal: controller.signal,
    });

    await Promise.resolve();

    expect(capturedHandler).not.toBeNull();

    capturedHandler?.({ type: 'SPOKE', sessionId: 'other', id: '1' });
    expect(streamMocks.writeSseMock).not.toHaveBeenCalled();

    capturedHandler?.({ type: 'SPOKE', sessionId: 'session-1', id: '2' });
    expect(streamMocks.writeSseMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SPOKE' })
    );

    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);

    const res = await requestPromise;
    expect(res.status).toBe(200);
    expect(streamMocks.unsubscribeMock).toHaveBeenCalledWith(capturedHandler);
  });
});
