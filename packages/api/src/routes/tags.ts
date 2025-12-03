import type { Hono } from 'hono';
import {
  listPromptTags,
  createPromptTag,
  updatePromptTag,
  deletePromptTag,
} from '../db/sessionsClient.js';
import { CreateTagRequestSchema, UpdateTagRequestSchema } from '@minimal-rpg/schemas';
import type { ApiError } from '../types.js';

// Transform DB row to API response format (camelCase)
function toTagResponse(row: {
  id: string;
  owner: string;
  name: string;
  short_description: string;
  prompt_text: string;
  created_at?: Date;
  updated_at?: Date;
}) {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    shortDescription: row.short_description || undefined,
    promptText: row.prompt_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function registerTagRoutes(app: Hono): void {
  // GET /tags - list all tags (admin only effectively, but public for now)
  app.get('/tags', async (c) => {
    const tags = await listPromptTags('admin');
    return c.json(tags.map(toTagResponse), 200);
  });

  // POST /tags - create a new tag
  app.post('/tags', async (c) => {
    const rawBody: unknown = await c.req.json().catch(() => null);
    const result = CreateTagRequestSchema.safeParse(rawBody);
    if (!result.success) {
      return c.json({ ok: false, error: 'Invalid request body' } satisfies ApiError, 400);
    }
    const { name, shortDescription, promptText } = result.data;

    try {
      const tag = await createPromptTag('admin', name, shortDescription ?? '', promptText);
      return c.json(toTagResponse(tag), 201);
    } catch (err) {
      console.error('[API] Failed to create tag:', err);
      return c.json({ ok: false, error: 'Failed to create tag' } satisfies ApiError, 500);
    }
  });

  // PUT /tags/:id - update a tag
  app.put('/tags/:id', async (c) => {
    const id = c.req.param('id');
    const rawBody: unknown = await c.req.json().catch(() => null);
    const result = UpdateTagRequestSchema.safeParse(rawBody);
    if (!result.success) {
      return c.json({ ok: false, error: 'Invalid request body' } satisfies ApiError, 400);
    }

    const updates = {
      ...(result.data.name !== undefined ? { name: result.data.name } : {}),
      ...(result.data.shortDescription !== undefined
        ? { shortDescription: result.data.shortDescription }
        : {}),
      ...(result.data.promptText !== undefined ? { promptText: result.data.promptText } : {}),
    };

    try {
      const updated = await updatePromptTag(id, 'admin', updates);
      if (!updated) {
        return c.json({ ok: false, error: 'Tag not found' } satisfies ApiError, 404);
      }
      return c.json(toTagResponse(updated), 200);
    } catch (err) {
      console.error('[API] Failed to update tag:', err);
      return c.json({ ok: false, error: 'Failed to update tag' } satisfies ApiError, 500);
    }
  });

  // DELETE /tags/:id - delete a tag
  app.delete('/tags/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const deleted = await deletePromptTag(id, 'admin');
      if (!deleted) {
        return c.json({ ok: false, error: 'Tag not found' } satisfies ApiError, 404);
      }
      return c.body(null, 204);
    } catch (err) {
      console.error('[API] Failed to delete tag:', err);
      return c.json({ ok: false, error: 'Failed to delete tag' } satisfies ApiError, 500);
    }
  });
}
