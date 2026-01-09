import type { Hono } from 'hono';
import {
  listPromptTags,
  getPromptTag,
  createPromptTag,
  updatePromptTag,
  deletePromptTag,
  createSessionTagBinding,
  getSessionTagsWithDefinitions,
  toggleSessionTagBinding,
  deleteSessionTagBinding,
} from '../../db/sessionsClient.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import {
  CreateTagRequestSchema,
  UpdateTagRequestSchema,
  TagQuerySchema,
  CreateTagBindingRequestSchema,
  UpdateTagBindingRequestSchema,
} from '@minimal-rpg/schemas';
import type { ApiError } from '../../types.js';
import { toId, toSessionId } from '../../utils/uuid.js';

// DB row types for tag responses (aligned with Drizzle schema)
interface PromptTagRow {
  id: string;
  name: string;
  category: string | null;
  promptText: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionTagBindingRow {
  id: string;
  sessionId: string;
  tagId: string;
  enabled: boolean | null;
  createdAt: Date;
}

// Transform DB row to API response format (camelCase, fulfilling schema expectations with defaults)
function toTagResponse(row: PromptTagRow) {
  return {
    id: row.id,
    owner: 'admin', // Global for now
    visibility: 'public' as const,
    name: row.name,
    shortDescription: row.description ?? undefined,
    category: row.category ?? 'style',
    promptText: row.promptText,
    activationMode: 'always' as const, // Simplified
    targetType: 'session' as const, // Simplified
    triggers: [],
    priority: 'normal' as const,
    compositionMode: 'append' as const,
    version: '1.0.0',
    isBuiltIn: row.isActive ?? true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Transform binding row to API response format
function toBindingResponse(row: SessionTagBindingRow) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    tagId: row.tagId,
    targetType: 'session' as const,
    targetEntityId: null,
    enabled: row.enabled ?? true,
    createdAt: row.createdAt,
  };
}

export function registerTagRoutes(app: Hono): void {
  // ============================================================================
  // Tag CRUD Routes
  // ============================================================================

  // GET /tags - list all tags with optional filters
  app.get('/tags', async (c) => {
    const rawQuery = c.req.query();
    const queryResult = TagQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      return c.json({ ok: false, error: 'Invalid query parameters' } satisfies ApiError, 400);
    }

    const { category, activationMode, isBuiltIn } = queryResult.data;
    const tagQuery: Parameters<typeof listPromptTags>[0] = {};

    if (category !== undefined) {
      tagQuery.category = category;
    }
    if (activationMode !== undefined) {
      tagQuery.activationMode = activationMode;
    }
    if (isBuiltIn !== undefined) {
      tagQuery.isBuiltIn = isBuiltIn;
    }

    const tags = await listPromptTags(tagQuery);

    return c.json(
      {
        tags: tags.map(toTagResponse),
        total: tags.length,
      },
      200
    );
  });

  // GET /tags/:id - get a single tag
  app.get('/tags/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const tag = await getPromptTag(toId(id));
      if (!tag) {
        return c.json({ ok: false, error: 'Tag not found' } satisfies ApiError, 404);
      }
      return c.json(toTagResponse(tag), 200);
    } catch (err) {
      console.error('[API] Failed to get tag:', err);
      return c.json({ ok: false, error: 'Failed to get tag' } satisfies ApiError, 500);
    }
  });

  // POST /tags - create a new tag
  app.post('/tags', async (c) => {
    const rawBody: unknown = await c.req.json().catch(() => null);
    const result = CreateTagRequestSchema.safeParse(rawBody);
    if (!result.success) {
      return c.json(
        {
          ok: false,
          error: 'Invalid request body',
          details: result.error.issues,
        } satisfies ApiError & { details: unknown },
        400
      );
    }

    try {
      const tagInput: Parameters<typeof createPromptTag>[0] = {
        name: result.data.name,
        promptText: result.data.promptText,
      };

      if (result.data.shortDescription !== undefined) {
        tagInput.shortDescription = result.data.shortDescription;
      }
      if (result.data.category !== undefined) {
        tagInput.category = result.data.category;
      }

      const tag = await createPromptTag(tagInput);
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
      return c.json(
        {
          ok: false,
          error: 'Invalid request body',
          details: result.error.issues,
        } satisfies ApiError & { details: unknown },
        400
      );
    }

    try {
      const updateInput: Parameters<typeof updatePromptTag>[1] = {};

      if (result.data.name !== undefined) {
        updateInput.name = result.data.name;
      }
      if (result.data.promptText !== undefined) {
        updateInput.promptText = result.data.promptText;
      }
      if (result.data.category !== undefined) {
        updateInput.category = result.data.category;
      }
      if (result.data.shortDescription !== undefined) {
        updateInput.shortDescription = result.data.shortDescription;
      }

      const updated = await updatePromptTag(toId(id), updateInput);
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
      const deleted = await deletePromptTag(toId(id));
      if (!deleted) {
        return c.json({ ok: false, error: 'Tag not found' } satisfies ApiError, 404);
      }
      return c.body(null, 204);
    } catch (err) {
      console.error('[API] Failed to delete tag:', err);
      return c.json({ ok: false, error: 'Failed to delete tag' } satisfies ApiError, 500);
    }
  });

  // ============================================================================
  // Session Tag Binding Routes
  // ============================================================================

  // GET /sessions/:sessionId/tags - get all tag bindings for a session
  app.get('/sessions/:sessionId/tags', async (c) => {
    const sessionId = c.req.param('sessionId');
    try {
      const ownerEmail = getOwnerEmail(c);
      const bindings = await getSessionTagsWithDefinitions(ownerEmail, toSessionId(sessionId), {
        enabledOnly: false,
      });
      return c.json(
        {
          bindings: bindings.map((b) => ({
            ...toBindingResponse(b),
            tag: toTagResponse(b.tag),
          })),
          total: bindings.length,
        },
        200
      );
    } catch (err) {
      console.error('[API] Failed to get session tag bindings:', err);
      return c.json({ ok: false, error: 'Failed to get session tags' } satisfies ApiError, 500);
    }
  });

  // POST /sessions/:sessionId/tags - bind a tag to a session
  app.post('/sessions/:sessionId/tags', async (c) => {
    const sessionId = c.req.param('sessionId');
    const rawBody: unknown = await c.req.json().catch(() => null);
    const result = CreateTagBindingRequestSchema.safeParse(rawBody);
    if (!result.success) {
      return c.json({ ok: false, error: 'Invalid request body' } satisfies ApiError, 400);
    }

    try {
      const ownerEmail = getOwnerEmail(c);
      const binding = await createSessionTagBinding(ownerEmail, {
        sessionId: toSessionId(sessionId),
        tagId: toId(result.data.tagId),
        ...(result.data.targetType ? { targetType: result.data.targetType } : {}),
        ...(result.data.targetEntityId !== undefined
          ? { targetEntityId: toId(result.data.targetEntityId) }
          : {}),
        ...(result.data.enabled !== undefined ? { enabled: result.data.enabled } : {}),
      });
      return c.json(toBindingResponse(binding), 201);
    } catch (err) {
      console.error('[API] Failed to create session tag binding:', err);
      return c.json({ ok: false, error: 'Failed to bind tag to session' } satisfies ApiError, 500);
    }
  });

  // PATCH /sessions/:sessionId/tags/:bindingId - toggle a tag binding
  app.patch('/sessions/:sessionId/tags/:bindingId', async (c) => {
    const bindingId = c.req.param('bindingId');
    const rawBody: unknown = await c.req.json().catch(() => null);
    const result = UpdateTagBindingRequestSchema.safeParse(rawBody);
    if (!result.success) {
      return c.json({ ok: false, error: 'Invalid request body' } satisfies ApiError, 400);
    }

    try {
      const ownerEmail = getOwnerEmail(c);
      const updated = await toggleSessionTagBinding(ownerEmail, toId(bindingId), result.data.enabled);
      if (!updated) {
        return c.json({ ok: false, error: 'Binding not found' } satisfies ApiError, 404);
      }
      return c.json(toBindingResponse(updated), 200);
    } catch (err) {
      console.error('[API] Failed to toggle session tag binding:', err);
      return c.json({ ok: false, error: 'Failed to toggle binding' } satisfies ApiError, 500);
    }
  });

  // DELETE /sessions/:sessionId/tags/:bindingId - remove a tag binding
  app.delete('/sessions/:sessionId/tags/:bindingId', async (c) => {
    const bindingId = c.req.param('bindingId');
    try {
      const ownerEmail = getOwnerEmail(c);
      const deleted = await deleteSessionTagBinding(ownerEmail, toId(bindingId));
      if (!deleted) {
        return c.json({ ok: false, error: 'Binding not found' } satisfies ApiError, 404);
      }
      return c.body(null, 204);
    } catch (err) {
      console.error('[API] Failed to delete session tag binding:', err);
      return c.json({ ok: false, error: 'Failed to remove binding' } satisfies ApiError, 500);
    }
  });
}
