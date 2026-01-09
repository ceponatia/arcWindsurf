/**
 * Session NPC operations
 * GET /sessions/:id/npcs - list NPC instances
 * POST /sessions/:id/npcs - create additional NPC instance
 */
import type { Context } from 'hono';
import { getSession, listActorStatesForSession, upsertActorState } from '@minimal-rpg/db/node';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import { notFound, badRequest, serverError, conflict } from '../../../utils/responses.js';
import { generateId } from '@minimal-rpg/utils';
import { findCharacter, isCreateNpcInstanceRequest } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toId, toSessionId } from '../../../utils/uuid.js';

interface NpcActorState {
  role?: string;
  label?: string | null;
  name?: string;
  status?: 'active' | 'inactive';
}

export async function handleListNpcs(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const sessionId = c.req.param('id');
  const session = await getSession(toSessionId(sessionId), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const instances = await listActorStatesForSession(toSessionId(sessionId));

  const npcs = instances
    .filter((ci) => ci.actorType === 'npc')
    .map((ci) => ({
      id: ci.actorId,
      role: (ci.state as NpcActorState).role ?? 'npc',
      label: (ci.state as NpcActorState).label ?? null,
      templateId: ci.entityProfileId,
      name: (ci.state as NpcActorState).name ?? 'Unknown',
      createdAt: ci.createdAt ?? undefined,
    }));

  return c.json({ ok: true, npcs }, 200);
}

export async function handleCreateNpc(c: Context, getLoaded: LoadedDataGetter): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const sessionId = c.req.param('id');
  const session = await getSession(toSessionId(sessionId), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const loaded = getLoaded();
  if (!loaded) return serverError(c, 'data not loaded');

  const rawBody: unknown = await c.req.json().catch(() => null);
  if (!isCreateNpcInstanceRequest(rawBody)) {
    return badRequest(c, 'templateId is required');
  }

  const { templateId } = rawBody;
  const requestedRole = typeof rawBody.role === 'string' ? rawBody.role.trim() : '';
  const normalizedRole = requestedRole.toLowerCase() === 'primary' ? 'primary' : 'npc';
  const label = typeof rawBody.label === 'string' ? rawBody.label.trim() : '';

  // Prevent multiple primary instances in a session.
  if (normalizedRole === 'primary') {
    const existing = await listActorStatesForSession(toSessionId(session.id));
    const existingPrimary = existing.find((a) => (a.state as NpcActorState).role === 'primary');
    if (existingPrimary) {
      return conflict(c, 'primary character already exists for session');
    }
  }

  const templateProfile = await findCharacter(loaded, templateId);
  if (!templateProfile) {
    return notFound(c, 'template not found');
  }

  const npcInstanceId = `${templateId}-${generateId()}`;

  try {
    await upsertActorState({
      sessionId: toSessionId(session.id),
      actorType: 'npc',
      actorId: npcInstanceId,
      entityProfileId: toId(templateId),
      state: {
        role: normalizedRole,
        label: label.length > 0 ? label : null,
        name: templateProfile.name,
        profileJson: JSON.stringify(templateProfile),
        status: 'active',
      },
      lastEventSeq: 0n,
    });
  } catch (err) {
    console.error('[API] Failed to create NPC instance', err);
    return serverError(c, 'failed to create npc instance');
  }

  return c.json(
    {
      ok: true,
      id: npcInstanceId,
      sessionId: session.id,
      role: normalizedRole,
      label: label.length > 0 ? label : null,
      templateId,
    },
    201
  );
}
