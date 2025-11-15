import type { Hono } from 'hono';
import { prisma, resolvedDbUrl, resolvedDbPath } from '../db/prisma.js';
import { Prisma as PrismaNs } from '@prisma/client';
import { access } from 'node:fs/promises';

// Narrowed env view for admin DB tools
interface AdminEnv extends NodeJS.ProcessEnv {
  ADMIN_DB_TOOLS?: string;
}

const env = process.env as AdminEnv;

export function registerAdminDbRoutes(app: Hono) {
  // GET /admin/db/overview - schema + sample rows for all models
  app.get('/admin/db/overview', async (c) => {
    if (env.ADMIN_DB_TOOLS !== 'true') {
      return c.json({ ok: false, error: 'Admin DB tools disabled' }, 403);
    }

    try {
      const models = PrismaNs.dmmf.datamodel.models;

      interface Column {
        name: string;
        type: string;
        isId: boolean;
        isRequired: boolean;
        isList: boolean;
      }

      type Row = Record<string, unknown>;

      const results: {
        name: string;
        columns: Column[];
        rowCount: number;
        sample: Row[];
      }[] = [];

      for (const m of models) {
        const name = m.name;

        const columns: Column[] = m.fields.map((f) => ({
          name: f.name,
          type: typeof f.type === 'string' ? String(f.type) : 'object',
          isId: !!f.isId,
          isRequired: !!f.isRequired,
          isList: !!f.isList,
        }));

        const delegateName = name.charAt(0).toLowerCase() + name.slice(1);

        // Narrow dynamic delegate access to a safe shape
        const delegateMap = prisma as unknown as Record<
          string,
          {
            count?: () => Promise<number>;
            findMany?: (args: { take?: number; orderBy?: unknown }) => Promise<Row[]>;
          }
        >;

        const delegate = delegateMap[delegateName];

        let rowCount = 0;
        let sample: Row[] = [];

        if (delegate) {
          try {
            rowCount = typeof delegate.count === 'function' ? await delegate.count() : 0;
          } catch {
            // ignore count failure
          }

          try {
            const orderBy = m.fields.some((f) => f.name === 'createdAt')
              ? { createdAt: 'desc' as const }
              : undefined;

            sample =
              typeof delegate.findMany === 'function'
                ? await delegate.findMany({ take: 50, orderBy })
                : [];
          } catch {
            // ignore sample failure
          }
        }

        results.push({ name, columns, rowCount, sample });
      }

      return c.json({ tables: results }, 200);
    } catch (err) {
      console.error('DB overview error', (err as Error).message);
      return c.json({ ok: false, error: 'Failed to load DB overview' }, 500);
    }
  });

  // GET /admin/db/path - show Prisma DB URL + on-disk file path (for SQLite)
  app.get('/admin/db/path', async (c) => {
    if (env.ADMIN_DB_TOOLS !== 'true') {
      return c.json({ ok: false, error: 'Admin DB tools disabled' }, 403);
    }

    let exists = false;
    try {
      await access(resolvedDbPath);
      exists = true;
    } catch {
      // file doesn't exist or not accessible
    }

    return c.json({ url: resolvedDbUrl, path: resolvedDbPath, exists }, 200);
  });

  // DELETE /admin/db/:model/:id - delete a row by model + id
  app.delete('/admin/db/:model/:id', async (c) => {
    if (env.ADMIN_DB_TOOLS !== 'true') {
      return c.json({ ok: false, error: 'Admin DB tools disabled' }, 403);
    }

    const modelParam = c.req.param('model');
    const idParam = c.req.param('id');

    if (!modelParam || !idParam) {
      return c.json({ ok: false, error: 'model and id are required' }, 400);
    }

    try {
      const models = PrismaNs.dmmf.datamodel.models;
      const model = models.find((m) => m.name.toLowerCase() === modelParam.toLowerCase());

      if (!model) {
        return c.json({ ok: false, error: 'Unknown model' }, 400);
      }

      const idFields = model.fields.filter((f) => f.isId);
      if (idFields.length !== 1 || idFields[0]?.name !== 'id') {
        return c.json(
          { ok: false, error: 'Delete only supported for single id primary key named "id"' },
          400,
        );
      }

      const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);

      const delegateMap = prisma as unknown as Record<
        string,
        { delete?: (args: { where: { id: string } }) => Promise<unknown> }
      >;

      const delegate = delegateMap[delegateName];

      if (!(delegate && typeof delegate.delete === 'function')) {
        return c.json({ ok: false, error: 'Delete not supported for model' }, 400);
      }

      try {
        await delegate.delete({ where: { id: idParam } });
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message)
            : String(err);

        if (/Record to delete does not exist/i.test(msg)) {
          return c.json({ ok: false, error: 'Not found' }, 404);
        }

        throw err;
      }

      console.warn(`[admin-db] delete ${model.name} id=${idParam}`);
      return c.body(null, 204);
    } catch (err) {
      console.error('DB delete error', (err as Error).message);
      return c.json({ ok: false, error: 'Failed to delete row' }, 500);
    }
  });
}
