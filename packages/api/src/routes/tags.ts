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
} from '../db/sessionsClient.js';
import {
  CreateTagRequestSchema,
  UpdateTagRequestSchema,
  TagQuerySchema,
  CreateTagBindingRequestSchema,
  UpdateTagBindingRequestSchema,
} from '@minimal-rpg/schemas';
import type { ApiError } from '../types.js';

// DB row types for tag responses
interface PromptTagRow {
  id: string;
  owner: string;
  visibility: 'private' | 'public' | 'unlisted';
  name: string;
  short_description: string | null;
  category: 'style' | 'mechanic' | 'content' | 'world' | 'behavior' | 'trigger' | 'meta';
  prompt_text: string;
  activation_mode: 'always' | 'conditional';
  target_type: 'session' | 'character' | 'npc' | 'player' | 'location' | 'setting';
  triggers: unknown;
  priority: 'override' | 'high' | 'normal' | 'low' | 'fallback';
  composition_mode: 'append' | 'prepend' | 'replace' | 'merge';
  conflicts_with: string[] | null;
  requires: string[] | null;
  version: string;
  changelog: string | null;
  is_built_in: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface SessionTagBindingRow {
  id: string;
  session_id: string;
  tag_id: string;
  target_type: 'session' | 'character' | 'npc' | 'player' | 'location' | 'setting';
  target_entity_id: string | null;
  enabled: boolean;
  created_at?: Date;
}

// Transform DB row to API response format (camelCase)
function toTagResponse(row: PromptTagRow) {
  return {
    id: row.id,
    owner: row.owner,
    visibility: row.visibility,
    name: row.name,
    shortDescription: row.short_description ?? undefined,
    category: row.category,
    promptText: row.prompt_text,
    activationMode: row.activation_mode,
    targetType: row.target_type,
    triggers: row.triggers,
    priority: row.priority,
    compositionMode: row.composition_mode,
    conflictsWith: row.conflicts_with ?? undefined,
    requires: row.requires ?? undefined,
    version: row.version,
    changelog: row.changelog ?? undefined,
    isBuiltIn: row.is_built_in,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Transform binding row to API response format
function toBindingResponse(row: SessionTagBindingRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    tagId: row.tag_id,
    targetType: row.target_type,
    targetEntityId: row.target_entity_id,
    enabled: row.enabled,
    createdAt: row.created_at,
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

    const { category, activationMode, visibility, isBuiltIn } = queryResult.data;
    const tags = await listPromptTags({
      owner: 'admin', // TODO: get from auth context
      ...(category ? { category } : {}),
      ...(activationMode ? { activationMode } : {}),
      ...(isBuiltIn !== undefined ? { isBuiltIn } : {}),
    });

    // Filter by visibility if specified (listPromptTags already handles access control)
    const filteredTags = visibility ? tags.filter((t) => t.visibility === visibility) : tags;

    return c.json(
      {
        tags: filteredTags.map(toTagResponse),
        total: filteredTags.length,
      },
      200
    );
  });

  // GET /tags/:id - get a single tag
  app.get('/tags/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const tag = await getPromptTag(id, 'admin');
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
      const tag = await createPromptTag({
        owner: 'admin', // TODO: get from auth context
        name: result.data.name,
        promptText: result.data.promptText,
        ...(result.data.shortDescription ? { shortDescription: result.data.shortDescription } : {}),
        ...(result.data.category ? { category: result.data.category } : {}),
        ...(result.data.activationMode ? { activationMode: result.data.activationMode } : {}),
        ...(result.data.targetType ? { targetType: result.data.targetType } : {}),
        ...(result.data.triggers ? { triggers: result.data.triggers } : {}),
        ...(result.data.priority ? { priority: result.data.priority } : {}),
        ...(result.data.compositionMode ? { compositionMode: result.data.compositionMode } : {}),
        ...(result.data.conflictsWith ? { conflictsWith: result.data.conflictsWith } : {}),
        ...(result.data.requires ? { requires: result.data.requires } : {}),
        ...(result.data.visibility ? { visibility: result.data.visibility } : {}),
      });
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
      const updated = await updatePromptTag(id, 'admin', {
        ...(result.data.name !== undefined && { name: result.data.name }),
        ...(result.data.shortDescription !== undefined && {
          shortDescription: result.data.shortDescription,
        }),
        ...(result.data.category !== undefined && { category: result.data.category }),
        ...(result.data.promptText !== undefined && { promptText: result.data.promptText }),
        ...(result.data.activationMode !== undefined && {
          activationMode: result.data.activationMode,
        }),
        ...(result.data.targetType !== undefined && { targetType: result.data.targetType }),
        ...(result.data.triggers !== undefined && { triggers: result.data.triggers }),
        ...(result.data.priority !== undefined && { priority: result.data.priority }),
        ...(result.data.compositionMode !== undefined && {
          compositionMode: result.data.compositionMode,
        }),
        ...(result.data.conflictsWith !== undefined && {
          conflictsWith: result.data.conflictsWith,
        }),
        ...(result.data.requires !== undefined && { requires: result.data.requires }),
        ...(result.data.visibility !== undefined && { visibility: result.data.visibility }),
        ...(result.data.changelog !== undefined && { changelog: result.data.changelog }),
      });
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
        return c.json({ ok: false, error: 'Tag not found or is built-in' } satisfies ApiError, 404);
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
      const bindings = await getSessionTagsWithDefinitions(sessionId, { enabledOnly: false });
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
      const binding = await createSessionTagBinding({
        sessionId,
        tagId: result.data.tagId,
        ...(result.data.targetType ? { targetType: result.data.targetType } : {}),
        ...(result.data.targetEntityId !== undefined
          ? { targetEntityId: result.data.targetEntityId }
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
      const updated = await toggleSessionTagBinding(bindingId, result.data.enabled);
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
      const deleted = await deleteSessionTagBinding(bindingId);
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
