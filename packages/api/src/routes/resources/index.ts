import type { Hono } from 'hono';
import { registerItemRoutes } from './items.js';
import { registerLocationMapRoutes } from './locations.js';
import { registerTagRoutes } from './tags.js';

export function registerResourceRoutes(app: Hono) {
  registerItemRoutes(app);
  registerLocationMapRoutes(app);
  registerTagRoutes(app);
}
