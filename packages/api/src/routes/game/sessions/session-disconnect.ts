import type { Context } from 'hono';
import { presenceService } from '@minimal-rpg/services';

/**
 * Handle session disconnect requests.
 * Called via navigator.sendBeacon when user closes tab or navigates away.
 * This allows faster session pause detection than waiting for heartbeat timeout.
 */
export function handleSessionDisconnect(c: Context): Response {
  const sessionId = c.req.param('id');
  if (!sessionId || sessionId.trim().length === 0) {
    return c.json({ ok: false, error: 'sessionId is required' }, 400);
  }

  presenceService.removeSession(sessionId);

  return c.json({ ok: true, sessionId }, 200);
}
