import { eq, and } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { sessions, sessionProjections } from '../schema/index.js';
import type { UUID } from '../types.js';

/**
 * Creates a new session and its initial projection in a transaction.
 */
export async function createSession(params: {
  id: UUID;
  ownerEmail: string;
  characterTemplateId: string;
  settingTemplateId: string;
}) {
  return await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(sessions)
      .values({
        id: params.id,
        ownerEmail: params.ownerEmail,
        name: `Session ${params.id.substring(0, 8)}`,
        playerCharacterId: params.characterTemplateId,
        settingId: params.settingTemplateId,
      })
      .returning();

    await tx.insert(sessionProjections).values({
      sessionId: params.id,
      location: {},
      inventory: {},
      time: {},
      worldState: {},
      lastEventSeq: 0n,
    });

    return session;
  });
}

/**
 * Gets a session by ID and owner.
 */
export async function getSession(id: UUID, ownerEmail: string) {
  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.ownerEmail, ownerEmail)))
    .limit(1);
  return result[0];
}

/**
 * Lists all sessions for an owner.
 */
export async function listSessions(ownerEmail: string) {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.ownerEmail, ownerEmail))
    .orderBy(sessions.createdAt);
}

/**
 * Deletes a session (and its projections/events via cascade).
 */
export async function deleteSession(id: UUID, ownerEmail: string) {
  await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.ownerEmail, ownerEmail)));
}

/**
 * Gets the current projection for a session.
 */
export async function getSessionProjection(sessionId: UUID) {
  const result = await db
    .select()
    .from(sessionProjections)
    .where(eq(sessionProjections.sessionId, sessionId))
    .limit(1);
  return result[0];
}

/**
 * Alias for getSessionProjection for convenience.
 */
export const getProjection = getSessionProjection;

/**
 * Updates a session projection's worldState.
 */
export async function upsertProjection(
  sessionId: UUID,
  updates: { worldState?: unknown; location?: unknown; inventory?: unknown; time?: unknown }
) {
  const updateData: Record<string, unknown> = {};
  if (updates.worldState !== undefined) updateData['worldState'] = updates.worldState;
  if (updates.location !== undefined) updateData['location'] = updates.location;
  if (updates.inventory !== undefined) updateData['inventory'] = updates.inventory;
  if (updates.time !== undefined) updateData['time'] = updates.time;

  await db
    .update(sessionProjections)
    .set(updateData)
    .where(eq(sessionProjections.sessionId, sessionId));
}
