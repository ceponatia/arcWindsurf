import { beforeEach, describe, expect, it, vi } from 'vitest';

interface JsonContext {
  json: (body: unknown, status: number) => unknown;
}

type OnErrorHandler = (err: unknown, c: JsonContext) => unknown;

class HonoMock {
  public static lastOnError: OnErrorHandler | undefined;

  /**
   * Capture the error handler registered by the server module.
   */
  public onError(handler: OnErrorHandler): this {
    HonoMock.lastOnError = handler;
    return this;
  }
}

vi.mock('hono', () => ({
  Hono: HonoMock,
}));

describe('server-impl error handler', () => {
  beforeEach(() => {
    vi.resetModules();
    HonoMock.lastOnError = undefined;
  });

  it('maps error objects with message to JSON response', async () => {
    await import('../src/server-impl.js');

    const handler = HonoMock.lastOnError;
    const jsonMock = vi.fn();
    const ctx: JsonContext = { json: jsonMock };

    expect(handler).toBeDefined();

    handler?.(new Error('boom'), ctx);

    expect(jsonMock).toHaveBeenCalledWith({ ok: false, error: 'boom' }, 500);
  });

  it('maps non-object errors to a generic message', async () => {
    await import('../src/server-impl.js');

    const handler = HonoMock.lastOnError;
    const jsonMock = vi.fn();
    const ctx: JsonContext = { json: jsonMock };

    expect(handler).toBeDefined();

    handler?.('nope', ctx);

    expect(jsonMock).toHaveBeenCalledWith({ ok: false, error: 'Server error' }, 500);
  });
});
