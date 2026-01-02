import type { Hono } from 'hono';
import { db } from '../../db/prismaClient.js';
import type { ApiError } from '../../types.js';
import type { CharacterInstanceRow, SettingInstanceRow } from '../../db/types.js';

/**
 * Entity usage summary returned from usage endpoints.
 */
export interface EntityUsageSummary {
  entityId: string;
  entityType: 'character' | 'setting' | 'persona' | 'location';
  sessions: SessionUsageInfo[];
  totalCount: number;
}

/**
 * Minimal session info for usage display.
 */
export interface SessionUsageInfo {
  sessionId: string;
  createdAt: string;
  /** Role of the character in the session (for character usage) */
  role?: string;
}

/**
 * Register entity usage routes.
 * These endpoints show "Where is this used?" for entities.
 *
 * GET /entity-usage/characters/:id - sessions using this character
 * GET /entity-usage/settings/:id - sessions using this setting
 * GET /entity-usage/personas/:id - sessions using this persona
 */
export function registerEntityUsageRoutes(app: Hono): void {
  /**
   * GET /entity-usage/characters/:id
   * Returns all sessions that use the specified character template.
   */
  app.get('/entity-usage/characters/:id', async (c) => {
    const characterId = c.req.param('id');

    if (!characterId) {
      return c.json({ ok: false, error: 'Character ID is required' } satisfies ApiError, 400);
    }

    try {
      // Find all character instances referencing this template
      const instances = await db.characterInstance.findMany({
        where: { templateId: characterId },
        orderBy: { createdAt: 'desc' },
      });

      const sessions: SessionUsageInfo[] = instances.map((inst: CharacterInstanceRow) => ({
        sessionId: inst.sessionId,
        createdAt: inst.createdAt?.toString() ?? new Date().toISOString(),
        role: inst.role,
      }));

      // Deduplicate by sessionId (in case of multiple instances per session)
      const uniqueSessions = Array.from(new Map(sessions.map((s) => [s.sessionId, s])).values());

      const result: EntityUsageSummary = {
        entityId: characterId,
        entityType: 'character',
        sessions: uniqueSessions,
        totalCount: uniqueSessions.length,
      };

      return c.json(result, 200);
    } catch (error) {
      console.error('Error fetching character usage:', error);
      return c.json(
        { ok: false, error: 'Failed to fetch character usage' } satisfies ApiError,
        500
      );
    }
  });

  /**
   * GET /entity-usage/settings/:id
   * Returns all sessions that use the specified setting template.
   */
  app.get('/entity-usage/settings/:id', async (c) => {
    const settingId = c.req.param('id');

    if (!settingId) {
      return c.json({ ok: false, error: 'Setting ID is required' } satisfies ApiError, 400);
    }

    try {
      // Find all setting instances referencing this template
      const instances = await db.settingInstance.findMany({
        where: { templateId: settingId },
        orderBy: { createdAt: 'desc' },
      });

      const sessions: SessionUsageInfo[] = instances.map((inst: SettingInstanceRow) => ({
        sessionId: inst.sessionId,
        createdAt: inst.createdAt?.toString() ?? new Date().toISOString(),
      }));

      const result: EntityUsageSummary = {
        entityId: settingId,
        entityType: 'setting',
        sessions,
        totalCount: sessions.length,
      };

      return c.json(result, 200);
    } catch (error) {
      console.error('Error fetching setting usage:', error);
      return c.json({ ok: false, error: 'Failed to fetch setting usage' } satisfies ApiError, 500);
    }
  });

  /**
   * GET /entity-usage/personas/:id
   * Returns all sessions that use the specified persona.
   */
  app.get('/entity-usage/personas/:id', async (c) => {
    const personaId = c.req.param('id');

    if (!personaId) {
      return c.json({ ok: false, error: 'Persona ID is required' } satisfies ApiError, 400);
    }

    try {
      // Find all session-persona bindings for this persona
      const bindings = await db.sessionPersona.findMany({
        where: { personaId },
        orderBy: { createdAt: 'desc' },
      });

      const sessions: SessionUsageInfo[] = bindings.map((binding) => ({
        sessionId: binding.sessionId,
        createdAt: binding.createdAt?.toString() ?? new Date().toISOString(),
      }));

      const result: EntityUsageSummary = {
        entityId: personaId,
        entityType: 'persona',
        sessions,
        totalCount: sessions.length,
      };

      return c.json(result, 200);
    } catch (error) {
      console.error('Error fetching persona usage:', error);
      return c.json({ ok: false, error: 'Failed to fetch persona usage' } satisfies ApiError, 500);
    }
  });
}
