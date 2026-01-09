import type { Hono } from 'hono';
import { getEventsForSession } from '@minimal-rpg/db/node';
import type { ApiError } from '../../types.js';
import { requireAdmin } from '../../auth/middleware.js';
import { toSessionId } from '../../utils/uuid.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

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
      const rawEvents = await getEventsForSession(toSessionId(sessionId));
      const eventsSlice = rawEvents.slice(-limit);

      const failures: ToolingFailureEntryDto[] = eventsSlice
        .map((event) => {
          const payload = isRecord(event.payload) ? event.payload : {};
          const payloadEvents = Array.isArray(payload['events'])
            ? payload['events'].filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
            : [];

          const toolingFailures: ToolingFailureEventDto[] = payloadEvents
            .filter((e) => e['type'] === 'tooling-failure')
            .map((e) => ({
              type: 'tooling-failure' as const,
              timestamp: typeof e['timestamp'] === 'string' ? e['timestamp'] : null,
              payload:
                e['payload'] && typeof e['payload'] === 'object'
                  ? (e['payload'] as Record<string, unknown>)
                  : {},
              ...(typeof e['source'] === 'string' ? { source: e['source'] } : {}),
            }));

          if (toolingFailures.length === 0) {
            return null;
          }

          const playerInputValue = payload['playerInput'];
          const playerInput = typeof playerInputValue === 'string' ? playerInputValue : '';
          const createdAt = event.timestamp?.toISOString?.() ?? new Date().toISOString();

          return {
            turnIdx: Number(event.sequence),
            createdAt,
            playerInput,
            events: toolingFailures,
          } satisfies ToolingFailureEntryDto;
        })
        .filter((entry): entry is ToolingFailureEntryDto => Boolean(entry));

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
