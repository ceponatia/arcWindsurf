import type { Hono } from 'hono';
import { getConfig } from '../../utils/config.js';
import type { HelloResponse, RuntimeConfigResponse, HealthResponse } from '../../types.js';
import { getVersion } from '../../utils/version.js';

// Registers /hello, /config, /health routes on the provided app
export function registerConfigRoutes(app: Hono) {
  // Simple sanity check endpoint
  app.get('/hello', (c) => {
    const body: HelloResponse = { ok: true, message: 'hello' };
    return c.json(body);
  });

  // Returns runtime config (minus secrets)
  app.get('/config', (c) => {
    const cfg = getConfig();
    const body: RuntimeConfigResponse = {
      port: cfg.port,
      contextWindow: cfg.contextWindow,
      temperature: cfg.temperature,
      topP: cfg.topP,
      openrouterModel: cfg.openrouterModel,
    };
    return c.json(body, 200);
  });

  // Health check: uptime, version, DB check, and LLM config status
  app.get('/health', async (c) => {
    const uptime = process.uptime();
    const version = await getVersion();

    // DB check (lazy-import db client to avoid circular deps)
    let dbOk = false;
    try {
      const { db } = await import('@minimal-rpg/db/node');
      await db.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (error) {
      console.warn('Database health check failed', error);
    }

    const cfg = getConfig();
    const llmOk = Boolean(cfg.openrouterApiKey && cfg.openrouterModel);

    const body: HealthResponse = {
      status: dbOk && llmOk ? 'ok' : 'degraded',
      uptime,
      version,
      db: { ok: dbOk },
      llm: { provider: 'openrouter', model: cfg.openrouterModel, configured: llmOk },
    };
    return c.json(body, 200);
  });
}
