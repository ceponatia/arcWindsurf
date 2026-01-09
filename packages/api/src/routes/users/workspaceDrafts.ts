/**
 * Workspace Drafts API Routes
 * CRUD operations for session workspace drafts.
 */
import type { Hono } from 'hono';
import { z } from 'zod';
import {
  createWorkspaceDraft,
  getWorkspaceDraft,
  listWorkspaceDrafts,
  updateWorkspaceDraft,
  deleteWorkspaceDraft,
  pruneOldWorkspaceDrafts,
} from '@minimal-rpg/db/node';
import type { ApiError } from '../../types.js';
import { toId } from '../../utils/uuid.js';

/**
 * Validation schema for workspace state
 */
const WorkspaceStateSchema = z
  .object({
    setting: z.record(z.string(), z.unknown()).optional(),
    locations: z.record(z.string(), z.unknown()).optional(),
    npcs: z.array(z.record(z.string(), z.unknown())).optional(),
    player: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.record(z.string(), z.unknown())).optional(),
    relationships: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const CreateDraftSchema = z.object({
  name: z.string().optional(),
  workspaceState: WorkspaceStateSchema.optional(),
  currentStep: z.string().optional(),
});

const UpdateDraftSchema = z.object({
  name: z.string().nullable().optional(),
  workspaceState: WorkspaceStateSchema.optional(),
  currentStep: z.string().optional(),
  validationState: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Register workspace draft routes.
 */
export function registerWorkspaceDraftRoutes(app: Hono): void {
  // GET /workspace-drafts - list drafts for user
  app.get('/workspace-drafts', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';
    const limit = parseInt(c.req.query('limit') ?? '20', 10);

    try {
      const drafts = await listWorkspaceDrafts(toId(userId), { limit });
      return c.json({ ok: true, drafts, total: drafts.length }, 200);
    } catch (err) {
      console.error('[API] Failed to list workspace drafts:', err);
      return c.json({ ok: false, error: 'failed to list drafts' } satisfies ApiError, 500);
    }
  });

  // GET /workspace-drafts/:id - get single draft
  app.get('/workspace-drafts/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const draft = await getWorkspaceDraft(toId(id));
      if (!draft) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.json({ ok: true, draft }, 200);
    } catch (err) {
      console.error('[API] Failed to get workspace draft:', err);
      return c.json({ ok: false, error: 'failed to get draft' } satisfies ApiError, 500);
    }
  });

  // POST /workspace-drafts - create new draft
  app.post('/workspace-drafts', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = CreateDraftSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    const { name, workspaceState, currentStep } = parsed.data;

    try {
      // Build params object conditionally to satisfy exactOptionalPropertyTypes
      const params: Parameters<typeof createWorkspaceDraft>[0] = { userId: toId(userId) };
      if (name !== undefined) params.name = name;
      if (workspaceState !== undefined)
        params.workspaceState = workspaceState as Record<string, unknown>;
      if (currentStep !== undefined) params.currentStep = currentStep;

      const draft = await createWorkspaceDraft(params);
      return c.json({ ok: true, draft }, 201);
    } catch (err) {
      console.error('[API] Failed to create workspace draft:', err);
      return c.json({ ok: false, error: 'failed to create draft' } satisfies ApiError, 500);
    }
  });

  // PUT /workspace-drafts/:id - update draft
  app.put('/workspace-drafts/:id', async (c) => {
    const id = c.req.param('id');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = UpdateDraftSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    const { name, workspaceState, currentStep, validationState } = parsed.data;

    try {
      // Build updates object conditionally to satisfy exactOptionalPropertyTypes
      const updates: Parameters<typeof updateWorkspaceDraft>[1] = {};
      if (name !== undefined) updates.name = name;
      if (workspaceState !== undefined)
        updates.workspaceState = workspaceState as Record<string, unknown>;
      if (currentStep !== undefined) updates.currentStep = currentStep;
      if (validationState !== undefined) updates.validationState = validationState;

      const draft = await updateWorkspaceDraft(toId(id), updates);
      if (!draft) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.json({ ok: true, draft }, 200);
    } catch (err) {
      console.error('[API] Failed to update workspace draft:', err);
      return c.json({ ok: false, error: 'failed to update draft' } satisfies ApiError, 500);
    }
  });

  // DELETE /workspace-drafts/:id - delete draft
  app.delete('/workspace-drafts/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const deleted = await deleteWorkspaceDraft(toId(id));
      if (!deleted) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.body(null, 204);
    } catch (err) {
      console.error('[API] Failed to delete workspace draft:', err);
      return c.json({ ok: false, error: 'failed to delete draft' } satisfies ApiError, 500);
    }
  });

  // POST /workspace-drafts/prune - cleanup old drafts
  app.post('/workspace-drafts/prune', async (c) => {
    const olderThanDays = parseInt(c.req.query('days') ?? '30', 10);

    try {
      const count = await pruneOldWorkspaceDrafts(olderThanDays);
      return c.json({ ok: true, deleted: count }, 200);
    } catch (err) {
      console.error('[API] Failed to prune workspace drafts:', err);
      return c.json({ ok: false, error: 'failed to prune drafts' } satisfies ApiError, 500);
    }
  });
}
