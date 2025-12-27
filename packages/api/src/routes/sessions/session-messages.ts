/**
 * Session message maintenance
 * PATCH /sessions/:id/messages/:idx - update message content
 * DELETE /sessions/:id/messages/:idx - delete a message
 */
import type { Context } from 'hono';
import { getSession } from '../../db/sessionsClient.js';
import { db } from '../../db/prismaClient.js';
import { notFound, badRequest } from '../../util/responses.js';
import { isMessageRequest } from './shared.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';

export async function handlePatchMessage(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const id = c.req.param('id');
  const idx = parseInt(c.req.param('idx'), 10);
  if (isNaN(idx)) return badRequest(c, 'invalid index');

  const session = await getSession(ownerEmail, id);
  if (!session) return notFound(c, 'session not found');

  const rawBody: unknown = await c.req.json().catch(() => null);
  if (!isMessageRequest(rawBody)) {
    return badRequest(c, 'content must be 1..4000 characters');
  }
  const { content } = rawBody;
  if (content.length < 1 || content.length > 4000) {
    return badRequest(c, 'content must be 1..4000 characters');
  }

  const updated = await db.message.update({
    where: { sessionId: id, idx },
    data: { content },
  });

  if (!updated) {
    return notFound(c, 'message not found');
  }

  return c.body(null, 204);
}

export async function handleDeleteMessage(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const id = c.req.param('id');
  const idx = parseInt(c.req.param('idx'), 10);
  if (isNaN(idx)) return badRequest(c, 'invalid index');

  console.info(`[API] Request to delete message: session=${id}, idx=${idx}`);

  const session = await getSession(ownerEmail, id);
  if (!session) return notFound(c, 'session not found');

  const existing = await db.message.findFirst({ where: { sessionId: id, idx } });
  if (!existing) {
    return notFound(c, 'message not found');
  }

  await db.message.deleteMany({ where: { sessionId: id, idx } });
  return c.body(null, 204);
}
