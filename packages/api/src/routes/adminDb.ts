import type { Hono } from 'hono';
import { getDbOverview, getDbPathInfo, deleteDbRow } from '@minimal-rpg/db/node';
import type { ApiError } from '../types.js';
import type { AdminDbOverview, AdminDbPathInfo } from '../db/types.js';

// Narrowed env view for admin DB tools
interface AdminEnv extends NodeJS.ProcessEnv {
  ADMIN_DB_TOOLS?: string;
}

const env = process.env as AdminEnv;

export function registerAdminDbRoutes(app: Hono) {
  // GET /admin/db/overview - schema + sample rows for all models
  app.get('/admin/db/overview', async (c) => {
    if (env.ADMIN_DB_TOOLS !== 'true') {
      return c.json({ ok: false, error: 'Admin DB tools disabled' } satisfies ApiError, 403);
    }

    try {
      const result: AdminDbOverview = await getDbOverview();
      return c.json(result, 200);
    } catch (err) {
      console.error('DB overview error', (err as Error).message);
      return c.json({ ok: false, error: 'Failed to load DB overview' } satisfies ApiError, 500);
    }
  });

  // GET /admin/db/path - show Prisma DB URL + on-disk file path (for SQLite)
  app.get('/admin/db/path', async (c) => {
    if (env.ADMIN_DB_TOOLS !== 'true') {
      return c.json({ ok: false, error: 'Admin DB tools disabled' } satisfies ApiError, 403);
    }

    const result: AdminDbPathInfo = await getDbPathInfo();
    return c.json(result, 200);
  });

  // DELETE /admin/db/:model/:id - delete a row by model + id
  app.delete('/admin/db/:model/:id', async (c) => {
    if (env.ADMIN_DB_TOOLS !== 'true') {
      return c.json({ ok: false, error: 'Admin DB tools disabled' } satisfies ApiError, 403);
    }

    const modelParam = c.req.param('model');
    const idParam = c.req.param('id');

    if (!modelParam || !idParam) {
      return c.json({ ok: false, error: 'model and id are required' } satisfies ApiError, 400);
    }

    try {
      await deleteDbRow(modelParam, idParam);
      console.warn(`[admin-db] delete ${modelParam} id=${idParam}`);
      return c.body(null, 204);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Not found') {
        return c.json({ ok: false, error: 'Not found' } satisfies ApiError, 404);
      }
      if (
        msg === 'Unknown model' ||
        msg === 'Delete not supported for model' ||
        msg.startsWith('Delete only supported')
      ) {
        return c.json({ ok: false, error: msg } satisfies ApiError, 400);
      }
      console.error('DB delete error', msg);
      return c.json({ ok: false, error: 'Failed to delete row' } satisfies ApiError, 500);
    }
  });
}
