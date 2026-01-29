import type { Context } from 'hono';
import { badRequest } from '../../../utils/responses.js';
import { presenceService } from '@minimal-rpg/services';

interface SessionHeartbeatResponse {
  ok: true;
  sessionId: string;
  status: 'running' | 'resumed';
  lastHeartbeat: string;
}

/**
 * Handle session heartbeat requests.
 */
export async function handleSessionHeartbeat(c: Context): Promise<Response> {
  const sessionId = c.req.param('id');
  if (!sessionId || sessionId.trim().length === 0) {
    return badRequest(c, 'sessionId is required');
  }

  const result = await presenceService.recordHeartbeat(sessionId);

  const response: SessionHeartbeatResponse = {
    ok: true,
    sessionId,
    status: result.status,
    lastHeartbeat: result.lastHeartbeatAt.toISOString(),
  };

  return c.json(response, 200);
}
