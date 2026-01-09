import type { Hono } from 'hono';
import type { LoadedDataGetter } from '../../loaders/types.js';
import { registerProfileRoutes } from './profiles.js';
import { registerUserPreferencesRoutes } from './preferences.js';
import { registerPersonaRoutes } from './personas.js';

interface UserRouteDeps {
  getLoaded: LoadedDataGetter;
}

export function registerUserRoutes(app: Hono, deps: UserRouteDeps) {
  registerProfileRoutes(app, deps);
  registerUserPreferencesRoutes(app);
  registerPersonaRoutes(app);
}
