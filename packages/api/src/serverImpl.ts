import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { loadData } from './data/loader.js';
import type { ApiError } from './types.js';
import type { LoadedData } from './data/types.js';
import { assertPromptConfigValid } from './llm/prompt.js';
import { getConfig } from './util/config.js';
import { ensureLocalAdminUser } from '@minimal-rpg/db/node';

// Route registrars
import { registerConfigRoutes } from './routes/config.js';
import { registerAdminDbRoutes } from './routes/adminDb.js';
import { registerAdminSessionRoutes } from './routes/adminSessions.js';
import { registerSessionRoutes } from './routes/sessions/index.js';
import { registerTurnRoutes } from './routes/turns.js';
import { registerProfileRoutes } from './routes/profiles.js';
import { registerTagRoutes } from './routes/tags.js';
import { registerItemRoutes } from './routes/items.js';
import { registerPersonaRoutes } from './routes/personas.js';
import { registerWorkspaceDraftRoutes } from './routes/workspaceDrafts.js';
import { registerLocationMapRoutes } from './routes/locationMaps.js';
import { registerHygieneRoutes } from './routes/hygiene.js';
import { registerScheduleRoutes } from './routes/schedules.js';
import { registerEntityUsageRoutes } from './routes/entityUsage.js';
import { registerUserPreferencesRoutes } from './routes/userPreferences.js';
import { registerAuthRoutes } from './routes/auth.js';
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
    // Ensure prompt config is valid before accepting traffic
    assertPromptConfigValid();

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
  registerConfigRoutes(app);
  registerAuthRoutes(app);
  registerAdminDbRoutes(app);
  registerAdminSessionRoutes(app);
  registerProfileRoutes(app, { getLoaded: (): LoadedData | undefined => loaded });
  registerSessionRoutes(app, { getLoaded: (): LoadedData | undefined => loaded });
  registerTurnRoutes(app);
  registerTagRoutes(app);
  registerItemRoutes(app);
  registerPersonaRoutes(app);
  registerWorkspaceDraftRoutes(app);
  registerLocationMapRoutes(app);
  registerHygieneRoutes(app);
  registerScheduleRoutes(app);
  registerEntityUsageRoutes(app);
  registerUserPreferencesRoutes(app);

  const port = cfg.port;
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
  console.log(`API server listening on http://0.0.0.0:${port}`);
}
