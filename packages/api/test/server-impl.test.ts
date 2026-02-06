import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const serverMocks = vi.hoisted(() => ({
  loadDataMock: vi.fn(),
  getConfigMock: vi.fn(),
  getEnvCsvMock: vi.fn(),
  getEnvValueMock: vi.fn(),
  initStudioSessionsTableMock: vi.fn(),
  cleanupExpiredSessionsMock: vi.fn(),
  ensureLocalAdminUserMock: vi.fn(),
  registerSystemRoutesMock: vi.fn(),
  registerAdminRoutesMock: vi.fn(),
  registerGameRoutesMock: vi.fn(),
  registerUserRoutesMock: vi.fn(),
  registerResourceRoutesMock: vi.fn(),
  registerStudioRoutesMock: vi.fn(),
  registerSensoryRoutesMock: vi.fn(),
  serveMock: vi.fn(),
  corsMock: vi.fn(),
  attachAuthUserMock: vi.fn(),
  requireAuthIfEnabledMock: vi.fn(),
  worldBusUseMock: vi.fn(),
  registerPersistenceHandlerMock: vi.fn(),
  persistWorldEventMock: vi.fn(),
  rulesEngineStartMock: vi.fn(),
  schedulerStartMock: vi.fn(),
  tickEmitterStartMock: vi.fn(),
}));

const telemetryMiddleware = { name: 'telemetry' };
const persistenceMiddleware = { name: 'persistence' };

vi.mock('../src/loaders/loader.js', () => ({
  loadData: serverMocks.loadDataMock,
}));

vi.mock('../src/utils/config.js', () => ({
  getConfig: serverMocks.getConfigMock,
}));

vi.mock('../src/utils/env.js', () => ({
  getEnvCsv: serverMocks.getEnvCsvMock,
  getEnvValue: serverMocks.getEnvValueMock,
}));

vi.mock('@minimal-rpg/db/node', () => ({
  ensureLocalAdminUser: serverMocks.ensureLocalAdminUserMock,
  initStudioSessionsTable: serverMocks.initStudioSessionsTableMock,
  cleanupExpiredSessions: serverMocks.cleanupExpiredSessionsMock,
}));

vi.mock('../src/routes/system/index.js', () => ({
  registerSystemRoutes: serverMocks.registerSystemRoutesMock,
}));

vi.mock('../src/routes/admin/index.js', () => ({
  registerAdminRoutes: serverMocks.registerAdminRoutesMock,
}));

vi.mock('../src/routes/game/index.js', () => ({
  registerGameRoutes: serverMocks.registerGameRoutesMock,
}));

vi.mock('../src/routes/users/index.js', () => ({
  registerUserRoutes: serverMocks.registerUserRoutesMock,
}));

vi.mock('../src/routes/resources/index.js', () => ({
  registerResourceRoutes: serverMocks.registerResourceRoutesMock,
}));

vi.mock('../src/routes/studio.js', () => ({
  registerStudioRoutes: serverMocks.registerStudioRoutesMock,
}));

vi.mock('../src/routes/sensory.js', () => ({
  registerSensoryRoutes: serverMocks.registerSensoryRoutesMock,
}));

vi.mock('../src/auth/middleware.js', () => ({
  attachAuthUser: serverMocks.attachAuthUserMock,
  requireAuthIfEnabled: serverMocks.requireAuthIfEnabledMock,
}));

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    use: serverMocks.worldBusUseMock,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
  telemetryMiddleware,
  persistenceMiddleware,
  registerPersistenceHandler: serverMocks.registerPersistenceHandlerMock,
}));

vi.mock('../src/services/event-persistence.js', () => ({
  persistWorldEvent: serverMocks.persistWorldEventMock,
}));

vi.mock('@minimal-rpg/services', () => ({
  rulesEngine: {
    start: serverMocks.rulesEngineStartMock,
  },
  Scheduler: {
    start: serverMocks.schedulerStartMock,
  },
  tickEmitter: {
    start: serverMocks.tickEmitterStartMock,
  },
}));

vi.mock('@hono/node-server', () => ({
  serve: serverMocks.serveMock,
}));

vi.mock('hono/cors', () => ({
  cors: serverMocks.corsMock,
}));

const loadedData = {
  characters: [{ id: 'npc-1' }],
  settings: [{ id: 'setting-1' }],
};

interface ServerImplModule {
  startServer: () => Promise<void>;
}

/**
 * Import a fresh instance of server-impl after resetting modules.
 */
async function importServerImpl(): Promise<ServerImplModule> {
  return (await import('../src/server-impl.js')) as ServerImplModule;
}

describe('server-impl bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    serverMocks.loadDataMock.mockResolvedValue(loadedData);
    serverMocks.getConfigMock.mockReturnValue({
      port: 4321,
      contextWindow: 64,
      temperature: 0.7,
      topP: 0.9,
      openrouterModel: 'openrouter/model',
      openrouterApiKey: 'key',
      debugLlm: false,
    });
    serverMocks.getEnvCsvMock.mockReturnValue(['https://app.example.com']);
    serverMocks.getEnvValueMock.mockImplementation((key: string) =>
      key === 'LOCAL_ADMIN_PASSWORD' ? 'admin-pass' : undefined
    );
    serverMocks.corsMock.mockReturnValue(async (_c: unknown, next: () => Promise<void>) => next());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes services, routes, and server on startup', async () => {
    const useSpy = vi.spyOn(Hono.prototype, 'use');
    const routeSpy = vi.spyOn(Hono.prototype, 'route');

    const { startServer } = await importServerImpl();

    await startServer();

    expect(serverMocks.worldBusUseMock).toHaveBeenCalledWith(telemetryMiddleware);
    expect(serverMocks.worldBusUseMock).toHaveBeenCalledWith(persistenceMiddleware);
    expect(serverMocks.registerPersistenceHandlerMock).toHaveBeenCalledWith(
      serverMocks.persistWorldEventMock
    );

    expect(serverMocks.rulesEngineStartMock).toHaveBeenCalledTimes(1);
    expect(serverMocks.schedulerStartMock).toHaveBeenCalledTimes(1);
    expect(serverMocks.tickEmitterStartMock).toHaveBeenCalledWith(5000);

    expect(serverMocks.initStudioSessionsTableMock).toHaveBeenCalledTimes(1);
    expect(serverMocks.cleanupExpiredSessionsMock).toHaveBeenCalledTimes(1);
    expect(serverMocks.loadDataMock).toHaveBeenCalledTimes(1);
    expect(serverMocks.ensureLocalAdminUserMock).toHaveBeenCalledWith({ password: 'admin-pass' });

    expect(serverMocks.corsMock).toHaveBeenCalledWith({
      origin: ['https://app.example.com'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });

    const corsHandler = serverMocks.corsMock.mock.results[0]?.value as unknown;
    expect(useSpy.mock.calls).toEqual(
      expect.arrayContaining([
        ['*', corsHandler],
        ['*', serverMocks.attachAuthUserMock],
        ['*', serverMocks.requireAuthIfEnabledMock],
      ])
    );
    expect(routeSpy).toHaveBeenCalledWith('/stream', expect.any(Hono));

    expect(serverMocks.registerSystemRoutesMock).toHaveBeenCalledWith(expect.any(Hono));
    expect(serverMocks.registerAdminRoutesMock).toHaveBeenCalledWith(expect.any(Hono));
    expect(serverMocks.registerResourceRoutesMock).toHaveBeenCalledWith(expect.any(Hono));
    expect(serverMocks.registerStudioRoutesMock).toHaveBeenCalledWith(expect.any(Hono));
    expect(serverMocks.registerSensoryRoutesMock).toHaveBeenCalledWith(expect.any(Hono));

    const userOptions = serverMocks.registerUserRoutesMock.mock.calls[0]?.[1] as {
      getLoaded?: () => typeof loadedData | undefined;
    };
    const gameOptions = serverMocks.registerGameRoutesMock.mock.calls[0]?.[1] as {
      getLoaded?: () => typeof loadedData | undefined;
    };

    expect(typeof userOptions.getLoaded).toBe('function');
    expect(typeof gameOptions.getLoaded).toBe('function');
    expect(userOptions.getLoaded?.()).toEqual(loadedData);
    expect(gameOptions.getLoaded?.()).toEqual(loadedData);

    const serveArgs = serverMocks.serveMock.mock.calls[0]?.[0] as {
      fetch?: unknown;
      port?: number;
      hostname?: string;
    };
    expect(typeof serveArgs.fetch).toBe('function');
    expect(serveArgs.port).toBe(4321);
    expect(serveArgs.hostname).toBe('0.0.0.0');
  });

  it('falls back to wildcard CORS origin when none configured', async () => {
    serverMocks.getEnvCsvMock.mockReturnValue([]);

    const { startServer } = await importServerImpl();

    await startServer();

    expect(serverMocks.corsMock).toHaveBeenCalledWith({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
  });

  it('exits the process when startup fails', async () => {
    serverMocks.loadDataMock.mockRejectedValue(new Error('load failed'));
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {
        throw new Error('process-exit');
      }) as never);

    const { startServer } = await importServerImpl();

    await expect(startServer()).rejects.toThrow('process-exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(serverMocks.serveMock).not.toHaveBeenCalled();
  });
});
