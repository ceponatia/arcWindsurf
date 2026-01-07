/**
 * Session message maintenance
 * PATCH /sessions/:id/messages/:idx - update message content
 * DELETE /sessions/:id/messages/:idx - delete a message
 */
import type { Context } from 'hono';
import {
  getSession,
  drizzle,
  events,
  eq,
  and,
  getEventsForSession,
  getEntityProfile,
} from '@minimal-rpg/db/node';
import { notFound, badRequest } from '../../../utils/responses.js';
import { isMessageRequest } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';

export async function handleListMessages(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const id = c.req.param('id');

  const session = await getSession(id as any, ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const allEvents = await getEventsForSession(id as any);
  const spokeEvents = allEvents.filter((e) => e.type === 'SPOKE');

  const messages = await Promise.all(
    spokeEvents.map(async (e) => {
      const payload = e.payload as any;
      let speaker;
      if (e.actorId && e.actorId !== 'player') {
        // Try to find actor profile
        const profile = await getEntityProfile(payload.entityProfileId || e.actorId);
        if (profile) {
          speaker = {
            id: e.actorId,
            name: profile.name,
          };
        }
      }

      return {
        role: e.actorId === 'player' ? 'user' : 'assistant',
        content: payload.content || '',
        createdAt: e.createdAt.toISOString(),
        idx: Number(e.sequence),
        speaker,
      };
    })
  );

  return c.json(messages, 200);
}

export async function handlePatchMessage(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const id = c.req.param('id');
  const idx = parseInt(c.req.param('idx'), 10);
  if (isNaN(idx)) return badRequest(c, 'invalid index');

  const session = await getSession(id as any, ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const rawBody: unknown = await c.req.json().catch(() => null);
  if (!isMessageRequest(rawBody)) {
    return badRequest(c, 'content must be 1..4000 characters');
  }
  const { content } = rawBody;
  if (content.length < 1 || content.length > 4000) {
    return badRequest(c, 'content must be 1..4000 characters');
  }

  const [existingEvent] = await drizzle
    .select()
    .from(events)
    .where(
      and(
        eq(events.sessionId, id as any),
        eq(events.sequence, BigInt(idx)),
        eq(events.type, 'SPOKE')
      )
    )
    .limit(1);

  if (!existingEvent) {
    return notFound(c, 'message not found');
  }

  const updated = await drizzle
    .update(events)
    .set({
      payload: { ...(existingEvent.payload as object), content },
      timestamp: new Date(),
    })
    .where(
      and(
        eq(events.sessionId, id as any),
        eq(events.sequence, BigInt(idx)),
        eq(events.type, 'SPOKE')
      )
    )
    .returning();

  if (!updated.length) {
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

  const session = await getSession(id as any, ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const [existing] = await drizzle
    .select()
    .from(events)
    .where(
      and(
        eq(events.sessionId, id as any),
        eq(events.sequence, BigInt(idx)),
        eq(events.type, 'SPOKE')
      )
    )
    .limit(1);

  if (!existing) {
    return notFound(c, 'message not found');
  }

  await drizzle
    .delete(events)
    .where(
      and(
        eq(events.sessionId, id as any),
        eq(events.sequence, BigInt(idx)),
        eq(events.type, 'SPOKE')
      )
    );

  return c.body(null, 204);
}
