import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { worldBus } from '@minimal-rpg/bus';
import { type WorldEvent } from '@minimal-rpg/schemas';
import { safeJsonStringify } from '../utils/json.js';

const router = new Hono();

/**
 * SSE endpoint for streaming world events to clients.
 * Filters by session_id if provided.
 */
router.get('/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');

  return streamSSE(c, async (stream) => {
    const handler = async (event: WorldEvent) => {
      // Filter by session if applicable
      const rawEvent = event as Record<string, unknown>;
      const payload = rawEvent['payload'] as Record<string, unknown> | undefined;
      const eventSessionId = (rawEvent['sessionId'] as string | undefined) ?? (payload?.['sessionId'] as string | undefined);

      if (eventSessionId && eventSessionId !== sessionId) {
        return;
      }

      await stream.writeSSE({
        data: safeJsonStringify(event),
        event: event.type,
        id: (rawEvent['id'] as string | number | undefined)?.toString() ?? Date.now().toString(),
      });
    };

    await worldBus.subscribe(handler);

    // Keep connection alive
    c.req.raw.signal.addEventListener('abort', () => {
      worldBus.unsubscribe(handler);
    });

    // Wait forever until disconnect
    while (!c.req.raw.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });
});

export default router;
