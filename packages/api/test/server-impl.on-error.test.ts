import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@minimal-rpg/db/node', () => ({
  ensureLocalAdminUser: vi.fn(),
  initStudioSessionsTable: vi.fn(),
  cleanupExpiredSessions: vi.fn(),
}));

vi.mock('../src/routes/system/index.js', () => ({
  registerSystemRoutes: vi.fn(),
}));

vi.mock('../src/routes/admin/index.js', () => ({
  registerAdminRoutes: vi.fn(),
}));

vi.mock('../src/routes/game/index.js', () => ({
  registerGameRoutes: vi.fn(),
}));

vi.mock('../src/routes/users/index.js', () => ({
  registerUserRoutes: vi.fn(),
}));

vi.mock('../src/routes/resources/index.js', () => ({
  registerResourceRoutes: vi.fn(),
}));

vi.mock('../src/routes/studio.js', () => ({
  registerStudioRoutes: vi.fn(),
}));

vi.mock('../src/routes/sensory.js', () => ({
  registerSensoryRoutes: vi.fn(),
}));

vi.mock('../src/routes/stream.js', () => ({
  default: {},
}));

describe('server-impl error handler', () => {
  beforeEach(() => {
    vi.resetModules();
    HonoMock.lastOnError = undefined;
    vi.stubEnv('DATABASE_URL', 'postgres://test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
