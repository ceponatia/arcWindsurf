import { describe, it, expect, vi, beforeEach } from 'vitest';

interface SpanLike {
  setAttribute: (key: string, value: unknown) => void;
  setStatus: (status: { code: number; message?: string }) => void;
  recordException: (error: Error) => void;
  end: () => void;
}

const { span, startActiveSpanMock } = vi.hoisted(() => {
  const span: SpanLike = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
  };

  const startActiveSpanMock = vi.fn(async (_name: string, fn: (active: SpanLike) => Promise<void>) => {
    await fn(span);
  });

  return { span, startActiveSpanMock };
});

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: startActiveSpanMock,
    }),
  },
}));

import type { WorldEvent } from '@minimal-rpg/schemas';
import { telemetryMiddleware } from '../src/middleware/telemetry.js';

describe('bus telemetry middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets attributes and status on success', async () => {
    const next = vi.fn(async () => undefined);

    await telemetryMiddleware(
      { type: 'TICK', tick: 1, timestamp: new Date(), sessionId: 'session-1' } as unknown as WorldEvent,
      next
    );

    expect(startActiveSpanMock).toHaveBeenCalled();
    expect(span.setAttribute).toHaveBeenCalledWith('event.type', 'TICK');
    expect(span.setAttribute).toHaveBeenCalledWith('session.id', 'session-1');
    expect(span.setStatus).toHaveBeenCalledWith({ code: 0 });
    expect(span.end).toHaveBeenCalled();
  });

  it('records exception on error', async () => {
    const next = vi.fn(async () => {
      throw new Error('boom');
    });

    await expect(
      telemetryMiddleware({ type: 'TICK', tick: 1, timestamp: new Date() } as unknown as WorldEvent, next)
    ).rejects.toThrow('boom');

    expect(span.recordException).toHaveBeenCalled();
    expect(span.setStatus).toHaveBeenCalledWith({ code: 1, message: 'boom' });
    expect(span.end).toHaveBeenCalled();
  });
});
