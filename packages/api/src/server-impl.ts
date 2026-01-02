import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { loadData } from './loaders/loader.js';
import type { ApiError } from './types.js';
import type { LoadedData } from './loaders/types.js';
import { getConfig } from './utils/config.js';
import { ensureLocalAdminUser } from '@minimal-rpg/db/node';

// Route registrars
import { registerSystemRoutes } from './routes/system/index.js';
import { registerAdminRoutes } from './routes/admin/index.js';
import { registerGameRoutes } from './routes/game/index.js';
import { registerUserRoutes } from './routes/users/index.js';
import { registerResourceRoutes } from './routes/resources/index.js';
import { attachAuthUser, requireAuthIfEnabled } from './auth/middleware.js';

const app = new Hono();

app.onError((err, c) => {
  console.error('[server] Unhandled error:', err);
  const message =
    err && typeof err === 'object' && 'message' in err
      ? ((err as { message?: string }).message ?? 'Server error')
      : 'Server error';
  const body: ApiError = { ok: false, error: message };
  return c.json(body, 500);
});

// Loaded data lives here; routes access it via a getter
let loaded: LoadedData | undefined = undefined;

export async function startServer(): Promise<void> {
  try {
    // Load character + setting JSON from data/
    loaded = await loadData();
    console.log(
      `Startup: loaded ${loaded.characters.length} characters and ${loaded.settings.length} settings`
    );

    // Local/dev bootstrap: if LOCAL_ADMIN_PASSWORD is provided, ensure an admin user exists.
    const localAdminPassword = process.env['LOCAL_ADMIN_PASSWORD'];
    if (localAdminPassword && localAdminPassword.trim().length > 0) {
      await ensureLocalAdminUser({ password: localAdminPassword });
      console.log('[auth] ensured local admin user (identifier=admin)');
    }
  } catch (err) {
    console.error('Failed to load data', (err as Error).message);
    process.exit(1);
  }

  const cfg = getConfig();
  console.log('Runtime config', {
    port: cfg.port,
    contextWindow: cfg.contextWindow,
    temperature: cfg.temperature,
    topP: cfg.topP,
    openrouterModel: cfg.openrouterModel,
    openrouterApiKeySet: Boolean(cfg.openrouterApiKey),
    governorDevMode: cfg.governorDevMode,
  });

  // Enable CORS for browser-based clients (Vite dev, etc.)
  const corsOrigins = (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    '*',
    cors({
      origin: corsOrigins.length > 0 ? corsOrigins : '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Attach auth user (if any) from Authorization header
  app.use('*', attachAuthUser);

  // Require auth for non-public routes when enabled
  app.use('*', requireAuthIfEnabled);

  // Register route groups
  registerSystemRoutes(app);
  registerAdminRoutes(app);
  registerUserRoutes(app, { getLoaded: (): LoadedData | undefined => loaded });
  registerGameRoutes(app, { getLoaded: (): LoadedData | undefined => loaded });
  registerResourceRoutes(app);

  const port = cfg.port;
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
  console.log(`API server listening on http://0.0.0.0:${port}`);
}
