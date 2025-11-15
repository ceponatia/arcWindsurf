import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { loadData, type LoadedData } from './data/loader.js';
import { assertPromptConfigValid } from './llm/prompt.js';
import { getConfig } from './util/config.js';

// Route registrars
import { registerConfigRoutes } from './routes/config.js';
import { registerAdminDbRoutes } from './routes/adminDb.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerProfileRoutes } from './routes/profiles.js';

const app = new Hono();

app.onError((err, c) => {
  console.error('[server] Unhandled error:', err);
  const message =
    err && typeof err === 'object' && 'message' in err
      ? ((err as { message?: string }).message ?? 'Server error')
      : 'Server error';
  return c.json({ ok: false, error: message }, 500);
});

// Loaded data lives here; routes access it via a getter
let loaded: LoadedData | undefined = undefined;

async function start() {
  try {
    // Ensure prompt config is valid before accepting traffic
    assertPromptConfigValid();

    // Load character + setting JSON from data/
    loaded = await loadData();
    console.log(
      `Startup: loaded ${loaded.characters.length} characters and ${loaded.settings.length} settings`,
    );
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
  });

  // Enable CORS for browser-based clients (Vite dev, etc.)
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  // Register route groups
  registerConfigRoutes(app);
  registerAdminDbRoutes(app);
  registerProfileRoutes(app, { getLoaded: () => loaded });
  registerSessionRoutes(app, { getLoaded: () => loaded });

  const port = cfg.port;
  serve({ fetch: app.fetch, port });
  console.log(`API server listening on http://localhost:${port}`);
}

void start();
