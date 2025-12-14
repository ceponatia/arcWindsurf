/**
 * User Preferences API Routes
 *
 * GET/PUT endpoints for user preferences (workspace mode, etc.)
 * Uses 'default' user until authentication is implemented.
 */
import type { Hono } from 'hono';
import { z } from 'zod';
import {
  getUserPreferences,
  updateUserPreferences,
  getOrCreateDefaultUser,
} from '@minimal-rpg/db/node';
import type { ApiError } from '../types.js';

/**
 * Schema for updating preferences
 */
const UpdatePreferencesSchema = z.object({
  workspaceMode: z.enum(['wizard', 'compact']).optional(),
});

/**
 * Register user preference routes.
 */
export function registerUserPreferencesRoutes(app: Hono): void {
  /**
   * GET /user/preferences
   * Get current user preferences
   */
  app.get('/user/preferences', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';

    try {
      // Ensure default user exists
      if (userId === 'default') {
        await getOrCreateDefaultUser();
      }

      const preferences = await getUserPreferences(userId);
      return c.json({ ok: true, preferences }, 200);
    } catch (err) {
      console.error('[API] Failed to get user preferences:', err);
      return c.json({ ok: false, error: 'failed to get preferences' } satisfies ApiError, 500);
    }
  });

  /**
   * PUT /user/preferences
   * Update user preferences (merges with existing)
   */
  app.put('/user/preferences', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = UpdatePreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    try {
      // Ensure default user exists
      if (userId === 'default') {
        await getOrCreateDefaultUser();
      }

      const preferences = await updateUserPreferences(userId, parsed.data);
      return c.json({ ok: true, preferences }, 200);
    } catch (err) {
      console.error('[API] Failed to update user preferences:', err);
      return c.json({ ok: false, error: 'failed to update preferences' } satisfies ApiError, 500);
    }
  });

  /**
   * GET /user/preferences/workspace-mode
   * Get just the workspace mode preference
   */
  app.get('/user/preferences/workspace-mode', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';

    try {
      if (userId === 'default') {
        await getOrCreateDefaultUser();
      }

      const preferences = await getUserPreferences(userId);
      const mode = preferences.workspaceMode ?? 'wizard';
      return c.json({ ok: true, mode }, 200);
    } catch (err) {
      console.error('[API] Failed to get workspace mode:', err);
      return c.json({ ok: false, error: 'failed to get workspace mode' } satisfies ApiError, 500);
    }
  });

  /**
   * PUT /user/preferences/workspace-mode
   * Set just the workspace mode preference
   */
  app.put('/user/preferences/workspace-mode', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = z.object({ mode: z.enum(['wizard', 'compact']) }).safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    try {
      if (userId === 'default') {
        await getOrCreateDefaultUser();
      }

      await updateUserPreferences(userId, { workspaceMode: parsed.data.mode });
      return c.json({ ok: true, mode: parsed.data.mode }, 200);
    } catch (err) {
      console.error('[API] Failed to set workspace mode:', err);
      return c.json({ ok: false, error: 'failed to set workspace mode' } satisfies ApiError, 500);
    }
  });
}
