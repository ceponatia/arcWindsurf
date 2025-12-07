// src/routes/items.ts
import type { Hono } from 'hono';
import { ItemDefinitionSchema } from '@minimal-rpg/schemas';
import { db } from '../db/prismaClient.js';
import type { ApiError, ItemSummary } from '../types.js';
import { mapItemSummary } from '../mappers/itemMappers.js';

export function registerItemRoutes(app: Hono): void {
  // GET /items - list all item definitions
  app.get('/items', async (c) => {
    const categoryParam = c.req.query('category');

    const options: { where?: { category: string }; orderBy: { createdAt: 'desc' } } = {
      orderBy: { createdAt: 'desc' },
    };
    if (categoryParam) {
      options.where = { category: categoryParam };
    }

    const dbRows = await db.itemDefinition.findMany(options);

    const items: ItemSummary[] = [];
    for (const row of dbRows) {
      try {
        // definitionJson comes back as object (JSONB) from postgres
        const json = row.definitionJson;
        const data: unknown = typeof json === 'string' ? (JSON.parse(json) as unknown) : json;
        const parsed = ItemDefinitionSchema.parse(data);
        items.push(mapItemSummary(parsed));
      } catch {
        // skip invalid rows silently; could log
      }
    }

    return c.json(items, 200);
  });

  // GET /items/:id - get full item definition
  app.get('/items/:id', async (c) => {
    const id = c.req.param('id');

    const dbItem = await db.itemDefinition.findUnique({
      where: { id },
    });

    if (!dbItem) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    try {
      // definitionJson comes back as object (JSONB) from postgres
      const json = dbItem.definitionJson;
      const data: unknown = typeof json === 'string' ? (JSON.parse(json) as unknown) : json;
      const parsed = ItemDefinitionSchema.parse(data);
      return c.json(parsed, 200);
    } catch {
      return c.json({ ok: false, error: 'invalid db data' } satisfies ApiError, 500);
    }
  });

  // POST /items - create or update an item definition
  app.post('/items', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = ItemDefinitionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    const definition = parsed.data;

    const existingDb = await db.itemDefinition.findUnique({
      where: { id: definition.id },
    });

    if (existingDb) {
      await db.itemDefinition.update({
        where: { id: definition.id },
        data: {
          category: definition.category,
          definitionJson: JSON.stringify(definition),
        },
      });
      const summary: ItemSummary = mapItemSummary(definition);
      return c.json({ ok: true, item: summary }, 200);
    }

    await db.itemDefinition.create({
      data: {
        id: definition.id,
        category: definition.category,
        definitionJson: JSON.stringify(definition),
      },
    });
    const summary: ItemSummary = mapItemSummary(definition);
    return c.json({ ok: true, item: summary }, 201);
  });

  // PUT /items/:id - update an item definition
  app.put('/items/:id', async (c) => {
    const id = c.req.param('id');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = ItemDefinitionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    const definition = parsed.data;

    if (definition.id !== id) {
      return c.json({ ok: false, error: 'id mismatch' } satisfies ApiError, 400);
    }

    const existingDb = await db.itemDefinition.findUnique({
      where: { id },
    });

    if (!existingDb) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    await db.itemDefinition.update({
      where: { id },
      data: {
        category: definition.category,
        definitionJson: JSON.stringify(definition),
      },
    });
    const summary: ItemSummary = mapItemSummary(definition);
    return c.json({ ok: true, item: summary }, 200);
  });

  // DELETE /items/:id - delete an item definition
  app.delete('/items/:id', async (c) => {
    const id = c.req.param('id');

    const existing = await db.itemDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    await db.itemDefinition.delete({ where: { id } });
    return c.body(null, 204);
  });
}
