import type { Hono } from 'hono';
import {
  drizzle as db,
  sessions as sessionsTable,
  actorStates,
  eq,
  desc,
  and,
} from '@minimal-rpg/db/node';
import type { ApiError } from '../../types.js';

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
      // Find all sessions referencing this character as the primary player character
      const sessions = await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.playerCharacterId, characterId as any))
        .orderBy(desc(sessionsTable.createdAt));

      const usageInfo: SessionUsageInfo[] = sessions.map((s) => ({
        sessionId: s.id,
        createdAt: s.createdAt.toISOString(),
        role: 'player',
      }));

      const result: EntityUsageSummary = {
        entityId: characterId,
        entityType: 'character',
        sessions: usageInfo,
        totalCount: usageInfo.length,
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
      // Find all sessions referencing this setting
      const sessions = await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.settingId, settingId as any))
        .orderBy(desc(sessionsTable.createdAt));

      const usageInfo: SessionUsageInfo[] = sessions.map((s) => ({
        sessionId: s.id,
        createdAt: s.createdAt.toISOString(),
      }));

      const result: EntityUsageSummary = {
        entityId: settingId,
        entityType: 'setting',
        sessions: usageInfo,
        totalCount: usageInfo.length,
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
      // Find all actor states referencing this persona profile
      const states = await db
        .select()
        .from(actorStates)
        .where(eq(actorStates.entityProfileId, personaId as any))
        .orderBy(desc(actorStates.createdAt));

      const usageInfo: SessionUsageInfo[] = states.map((s) => ({
        sessionId: s.sessionId,
        createdAt: s.createdAt.toISOString(),
        role: s.actorType,
      }));

      const result: EntityUsageSummary = {
        entityId: personaId,
        entityType: 'persona',
        sessions: usageInfo,
        totalCount: usageInfo.length,
      };

      return c.json(result, 200);
    } catch (error) {
      console.error('Error fetching persona usage:', error);
      return c.json({ ok: false, error: 'Failed to fetch persona usage' } satisfies ApiError, 500);
    }
  });
}
