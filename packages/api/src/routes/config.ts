import type { Hono } from 'hono';
import { getConfig } from '../util/config.js';
import { getVersion } from '../util/version.js';

// Registers /hello, /config, /health routes on the provided app
export function registerConfigRoutes(app: Hono) {
  // Simple sanity check endpoint
  app.get('/hello', (c) => c.json({ ok: true, message: 'hello' }));

  // Returns runtime config (minus secrets)
  app.get('/config', (c) => {
    const cfg = getConfig();
    return c.json(
      {
        port: cfg.port,
        contextWindow: cfg.contextWindow,
        temperature: cfg.temperature,
        topP: cfg.topP,
        openrouterModel: cfg.openrouterModel,
      },
      200,
    );
  });

  // Health check: uptime, version, DB check, and LLM config status
  app.get('/health', async (c) => {
    const uptime = process.uptime();
    const version = await getVersion();

    // DB check (lazy-import prisma to avoid circular deps)
    let dbOk = false;
    try {
      const { prisma } = await import('../db/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (error) {
      console.warn('Database health check failed', error);
    }

    const cfg = getConfig();
    const llmOk = Boolean(cfg.openrouterApiKey && cfg.openrouterModel);

    return c.json(
      {
        status: dbOk && llmOk ? 'ok' : 'degraded',
        uptime,
        version,
        db: { ok: dbOk },
        llm: { provider: 'openrouter', model: cfg.openrouterModel, configured: llmOk },
      },
      200,
    );
  });
}
