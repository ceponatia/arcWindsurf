import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { registerConfigRoutes } from '../../../src/routes/system/config.js';

const configMocks = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  getVersionMock: vi.fn(),
  queryRawMock: vi.fn(),
}));

vi.mock('../../../src/utils/config.js', () => ({
  getConfig: configMocks.getConfigMock,
}));

vi.mock('../../../src/utils/version.js', () => ({
  getVersion: configMocks.getVersionMock,
}));

vi.mock('@minimal-rpg/db/node', () => ({
  db: {
    $queryRaw: configMocks.queryRawMock,
  },
}));

/**
 * Build a minimal Hono app with config routes.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerConfigRoutes(app);
  return app;
}

describe('routes/system/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configMocks.getConfigMock.mockReturnValue({
      port: 3001,
      contextWindow: 30,
      temperature: 0.7,
      topP: 0.9,
      openrouterApiKey: 'key',
      openrouterModel: 'openrouter/model',
      debugLlm: false,
    });
    configMocks.getVersionMock.mockResolvedValue('1.2.3');
    configMocks.queryRawMock.mockResolvedValue([{ ok: true }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns hello response', async () => {
    const app = makeApp();
    const res = await app.request('/hello');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, message: 'hello' });
  });

  it('returns runtime config without secrets', async () => {
    const app = makeApp();
    const res = await app.request('/config');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      port: 3001,
      contextWindow: 30,
      temperature: 0.7,
      topP: 0.9,
      openrouterModel: 'openrouter/model',
    });
  });

  it('returns ok health when db and llm are configured', async () => {
    const app = makeApp();
    const res = await app.request('/health');

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      db: { ok: boolean };
      llm: { configured: boolean };
      version: string;
    };
    expect(body.status).toBe('ok');
    expect(body.db.ok).toBe(true);
    expect(body.llm.configured).toBe(true);
    expect(body.version).toBe('1.2.3');
  });

  it('returns degraded health when db fails', async () => {
    configMocks.queryRawMock.mockRejectedValue(new Error('db down'));

    const app = makeApp();
    const res = await app.request('/health');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; db: { ok: boolean } };
    expect(body.status).toBe('degraded');
    expect(body.db.ok).toBe(false);
  });
});
