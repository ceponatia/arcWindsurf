import type { Hono } from 'hono';
import { registerAdminDbRoutes } from './db.js';
import { registerAdminSessionRoutes } from './sessions.js';

export function registerAdminRoutes(app: Hono) {
  registerAdminDbRoutes(app);
  registerAdminSessionRoutes(app);
}
