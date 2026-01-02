import type { Hono } from 'hono';
import { registerAuthRoutes } from './auth.js';
import { registerConfigRoutes } from './config.js';
import { registerEntityUsageRoutes } from './usage.js';

export function registerSystemRoutes(app: Hono) {
  registerAuthRoutes(app);
  registerConfigRoutes(app);
  registerEntityUsageRoutes(app);
}
