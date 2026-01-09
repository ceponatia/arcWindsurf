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
import { toId, toSessionId } from '../../../utils/uuid.js';

interface SpokePayload {
  content?: string;
  entityProfileId?: string;
}

type DbEvent = Awaited<ReturnType<typeof getEventsForSession>>[number];
type SpokeEventRecord = DbEvent & { actorId: string; type: 'SPOKE' };

export async function handleListMessages(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const id = c.req.param('id');

  const session = await getSession(toSessionId(id), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const allEvents = await getEventsForSession(toSessionId(id));
  const spokeEvents: SpokeEventRecord[] = allEvents.filter(
    (event): event is SpokeEventRecord => event.type === 'SPOKE' && typeof event.actorId === 'string'
  );

  const messages = await Promise.all(
    spokeEvents.map(async (event) => {
      const payload = (event.payload ?? {}) as SpokePayload;
      const rawTimestamp = (event as DbEvent).timestamp;
      const createdAt = rawTimestamp instanceof Date ? rawTimestamp : new Date(rawTimestamp ?? Date.now());
      const sequence = typeof event.sequence === 'bigint' ? event.sequence : BigInt(event.sequence ?? 0);
      let speaker;
      if (event.actorId && event.actorId !== 'player') {
        // Try to find actor profile
        const profileId = payload.entityProfileId ?? event.actorId;
        const profile = profileId ? await getEntityProfile(toId(profileId)) : null;
        if (profile) {
          speaker = {
            id: event.actorId,
            name: profile.name,
          };
        }
      }

      return {
        role: event.actorId === 'player' ? 'user' : 'assistant',
        content: payload.content ?? '',
        createdAt: createdAt.toISOString(),
        idx: Number(sequence),
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

  const session = await getSession(toSessionId(id), ownerEmail);
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
        eq(events.sessionId, toSessionId(id)),
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
      payload: { ...(existingEvent.payload as SpokePayload), content },
      timestamp: new Date(),
    })
    .where(
      and(
        eq(events.sessionId, toSessionId(id)),
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

  const session = await getSession(toSessionId(id), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const [existing] = await drizzle
    .select()
    .from(events)
    .where(
      and(
        eq(events.sessionId, toSessionId(id)),
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
        eq(events.sessionId, toSessionId(id)),
        eq(events.sequence, BigInt(idx)),
        eq(events.type, 'SPOKE')
      )
    );

  return c.body(null, 204);
}
