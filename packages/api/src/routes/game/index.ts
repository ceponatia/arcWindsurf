import type { Hono } from 'hono';
import type { LoadedDataGetter } from '../../loaders/types.js';
import { registerSessionRoutes } from './sessions/index.js';
import { registerTurnRoutes } from './turns.js';
import { registerHygieneRoutes } from './hygiene.js';
import { registerScheduleRoutes } from './schedules.js';

interface GameRouteDeps {
  getLoaded: LoadedDataGetter;
}

export function registerGameRoutes(app: Hono, deps: GameRouteDeps) {
  registerSessionRoutes(app, deps);
  registerTurnRoutes(app);
  registerHygieneRoutes(app);
  registerScheduleRoutes(app);
}
