import type { Hono } from 'hono';
import { getSessionHistory } from '@minimal-rpg/db/node';
import type { ApiError } from '../types.js';
import { requireAdmin } from '../auth/middleware.js';

interface ToolingFailureEventDto {
  type: 'tooling-failure';
  timestamp: string | null;
  payload: Record<string, unknown>;
  source?: string;
}

interface ToolingFailureEntryDto {
  turnIdx: number;
  createdAt: string;
  playerInput: string;
  events: ToolingFailureEventDto[];
}

export function registerAdminSessionRoutes(app: Hono) {
  // GET /admin/sessions/:sessionId/tooling-failures - show tooling-failure events
  app.get('/admin/sessions/:sessionId/tooling-failures', requireAdmin, async (c) => {
    const sessionId = c.req.param('sessionId');
    const limitParam = c.req.query('limit');

    const limitRaw = limitParam ? Number(limitParam) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

    if (!sessionId) {
      return c.json({ ok: false, error: 'sessionId is required' } satisfies ApiError, 400);
    }

    try {
      const history = await getSessionHistory(sessionId, { limit });

      const failures: ToolingFailureEntryDto[] = history
        .map((h) => {
          const debug = h.debug;
          const events = (debug?.['events'] as unknown[]) ?? [];

          const toolingFailures: ToolingFailureEventDto[] = events
            .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
            .filter((e) => e['type'] === 'tooling-failure')
            .map((e) => ({
              type: 'tooling-failure',
              timestamp: typeof e['timestamp'] === 'string' ? e['timestamp'] : null,
              payload:
                e['payload'] && typeof e['payload'] === 'object'
                  ? (e['payload'] as Record<string, unknown>)
                  : {},
              ...(typeof e['source'] === 'string' ? { source: e['source'] } : {}),
            }));

          return {
            turnIdx: h.turnIdx,
            createdAt: h.createdAt,
            playerInput: h.playerInput,
            events: toolingFailures,
          };
        })
        .filter((h) => h.events.length > 0);

      return c.json(
        {
          ok: true,
          sessionId,
          limit,
          count: failures.length,
          failures,
        },
        200
      );
    } catch (err) {
      console.error('[admin-sessions] tooling-failures error', (err as Error).message);
      return c.json(
        { ok: false, error: 'Failed to load tooling failure events' } satisfies ApiError,
        500
      );
    }
  });
}
