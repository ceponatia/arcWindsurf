/**
 * Turn Request Validation
 *
 * Validates and parses incoming turn requests.
 */
import type { Context } from 'hono';
import { badRequest } from '../../util/responses.js';
import type { TurnRequestBody, ValidatedTurnRequest } from './types.js';

/**
 * Type guard for turn request body.
 */
function isTurnRequestBody(body: unknown): body is TurnRequestBody {
  return Boolean(
    body &&
      typeof body === 'object' &&
      typeof (body as { input?: unknown }).input === 'string' &&
      (body as { input: string }).input.length > 0 &&
      (typeof (body as { npcId?: unknown }).npcId === 'undefined' ||
        typeof (body as { npcId?: unknown }).npcId === 'string')
  );
}

/**
 * Validate and parse turn request from Hono context.
 *
 * @param c - Hono context
 * @returns Validated request or error response
 */
export async function validateTurnRequest(
  c: Context
): Promise<{ success: true; data: ValidatedTurnRequest } | { success: false; response: Response }> {
  const rawBody: unknown = await c.req.json().catch(() => null);

  if (!isTurnRequestBody(rawBody)) {
    return {
      success: false,
      response: badRequest(c, 'input is required'),
    };
  }

  const { input, npcId: npcIdRaw } = rawBody;
  const requestedNpcId = typeof npcIdRaw === 'string' ? npcIdRaw.trim() : '';
  const targetNpcId = requestedNpcId.length > 0 ? requestedNpcId : null;

  return {
    success: true,
    data: {
      input,
      targetNpcId,
    },
  };
}
