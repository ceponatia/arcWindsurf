// src/routes/items.ts
import type { Hono } from 'hono';
import { ItemDefinitionSchema } from '@minimal-rpg/schemas';
import {
  listEntityProfiles,
  getEntityProfile,
  createEntityProfile,
  updateEntityProfile,
  deleteEntityProfile,
} from '../../db/sessionsClient.js';
import type { ApiError } from '../../types.js';
import type { ItemSummary } from '../../loaders/types.js';
import { mapItemSummary } from '../../mappers/item-mappers.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';

export function registerItemRoutes(app: Hono): void {
  // GET /items - list all item definitions
  app.get('/items', async (c) => {
    const ownerEmail = getOwnerEmail(c);
    const categoryParam = c.req.query('category');

    const profiles = await listEntityProfiles({
      entityType: 'item',
      ownerEmail,
      visibility: 'public',
    });

    const items: ItemSummary[] = [];
    for (const profile of profiles) {
      try {
        const data = profile.profileJson;
        // Filter by category if requested (simplification: category is usually inside profileJson for items)
        if (categoryParam && (data as any).category !== categoryParam) {
          continue;
        }
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
    const ownerEmail = getOwnerEmail(c);

    const profile = await getEntityProfile(id as any, ownerEmail);

    if (!profile || profile.entityType !== 'item') {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    try {
      const parsed = ItemDefinitionSchema.parse(profile.profileJson);
      return c.json(parsed, 200);
    } catch {
      return c.json({ ok: false, error: 'invalid db data' } satisfies ApiError, 500);
    }
  });

  // POST /items - create or update an item definition
  app.post('/items', async (c) => {
    const ownerEmail = getOwnerEmail(c);
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

    const existing = await getEntityProfile(definition.id as any, ownerEmail);

    if (existing) {
      await updateEntityProfile(definition.id as any, ownerEmail, {
        profileJson: definition as any,
      });
      const summary: ItemSummary = mapItemSummary(definition);
      return c.json({ ok: true, item: summary }, 200);
    }

    await createEntityProfile({
      id: definition.id as any,
      entityType: 'item',
      name: definition.name,
      ownerEmail,
      visibility: 'public',
      profileJson: definition as any,
    });
    const summary: ItemSummary = mapItemSummary(definition);
    return c.json({ ok: true, item: summary }, 201);
  });

  // PUT /items/:id - update an item definition
  app.put('/items/:id', async (c) => {
    const id = c.req.param('id');
    const ownerEmail = getOwnerEmail(c);

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

    const existing = await getEntityProfile(id as any, ownerEmail);

    if (!existing || existing.entityType !== 'item') {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    await updateEntityProfile(id as any, ownerEmail, {
      profileJson: definition as any,
    });
    const summary: ItemSummary = mapItemSummary(definition);
    return c.json({ ok: true, item: summary }, 200);
  });

  // DELETE /items/:id - delete an item definition
  app.delete('/items/:id', async (c) => {
    const id = c.req.param('id');
    const ownerEmail = getOwnerEmail(c);

    const deleted = await deleteEntityProfile(id as any, ownerEmail);

    if (!deleted) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    return c.body(null, 204);
  });
}
