import { describe, it, expect, vi, beforeEach } from 'vitest';

async function loadPersistence() {
  vi.resetModules();
  return await import('../src/middleware/persistence.js');
}

describe('bus persistence middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls registered handler before next', async () => {
    const { registerPersistenceHandler, persistenceMiddleware } = await loadPersistence();
    const handler = vi.fn(async () => undefined);
    registerPersistenceHandler(handler);

    const next = vi.fn(async () => undefined);

    await persistenceMiddleware(
      { type: 'TICK', tick: 1, timestamp: new Date() } as unknown as import('@minimal-rpg/schemas').WorldEvent,
      next
    );

    expect(handler).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('logs errors and still calls next', async () => {
    const { registerPersistenceHandler, persistenceMiddleware } = await loadPersistence();
    const handler = vi.fn(async () => {
      throw new Error('fail');
    });
    registerPersistenceHandler(handler);

    const next = vi.fn(async () => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await persistenceMiddleware(
      { type: 'TICK', tick: 1, timestamp: new Date() } as unknown as import('@minimal-rpg/schemas').WorldEvent,
      next
    );

    expect(errorSpy).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
