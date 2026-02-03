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
} from '@minimal-rpg/db/node';
import { notFound } from '../../../utils/responses.js';
import { MessageRequestSchema } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toSessionId } from '../../../utils/uuid.js';
import { mapSpokeEventsToMessages } from './message-mapping.js';
import { createMessageMappingDeps } from './message-mapping-deps.js';
import type { SpokePayload } from './types.js';
import { validateBody, validateParam, validateParamId } from '../../../utils/request-validation.js';
import { z } from 'zod';

type DbEvent = Awaited<ReturnType<typeof getEventsForSession>>[number];
type SpokeEventRecord = DbEvent & { actorId: string; type: 'SPOKE' };

export async function handleListMessages(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;

  const session = await getSession(toSessionId(id), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const allEvents = await getEventsForSession(toSessionId(id));
  const spokeEvents: SpokeEventRecord[] = allEvents.filter(
    (event): event is SpokeEventRecord => event.type === 'SPOKE' && typeof event.actorId === 'string'
  );

  const messages = await mapSpokeEventsToMessages(spokeEvents, createMessageMappingDeps(id));

  return c.json(messages, 200);
}

export async function handlePatchMessage(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;

  const idxResult = validateParam(c, 'idx', z.coerce.number().int().nonnegative());
  if (!idxResult.success) return idxResult.errorResponse;
  const idx = idxResult.data;

  const session = await getSession(toSessionId(id), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const bodyResult = await validateBody(c, MessageRequestSchema);
  if (!bodyResult.success) return bodyResult.errorResponse;
  const { content } = bodyResult.data;

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
  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;

  const idxResult = validateParam(c, 'idx', z.coerce.number().int().nonnegative());
  if (!idxResult.success) return idxResult.errorResponse;
  const idx = idxResult.data;

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
