/**
 * Session NPC operations
 * GET /sessions/:id/npcs - list NPC instances
 * POST /sessions/:id/npcs - create additional NPC instance
 */
import type { Context } from 'hono';
import { getSession } from '../../db/sessionsClient.js';
import { db } from '../../db/prismaClient.js';
import type { LoadedDataGetter } from '../../data/types.js';
import { notFound, badRequest, serverError, conflict } from '../../util/responses.js';
import { generateId } from '../../util/id.js';
import { findCharacter, isCreateNpcInstanceRequest, tryParseName } from './shared.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';

export async function handleListNpcs(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const sessionId = c.req.param('id');
  const session = await getSession(ownerEmail, sessionId);
  if (!session) return notFound(c, 'session not found');

  const instances = await db.characterInstance.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  const npcs = instances.map((ci) => ({
    id: ci.id,
    role: ci.role,
    label: ci.label ?? null,
    templateId: ci.templateId,
    name: tryParseName(ci.profileJson),
    createdAt: ci.createdAt ?? undefined,
  }));

  return c.json({ ok: true, npcs }, 200);
}

export async function handleCreateNpc(c: Context, getLoaded: LoadedDataGetter): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const sessionId = c.req.param('id');
  const session = await getSession(ownerEmail, sessionId);
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
    const existingPrimary = await db.characterInstance.findUnique({
      where: { sessionId: session.id, role: 'primary' },
    });
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
    await db.characterInstance.create({
      data: {
        id: npcInstanceId,
        sessionId: session.id,
        templateId,
        templateSnapshot: JSON.stringify(templateProfile),
        profileJson: JSON.stringify(templateProfile),
        overridesJson: JSON.stringify({}),
        role: normalizedRole,
        label: label.length > 0 ? label : null,
        ownerEmail,
      },
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
