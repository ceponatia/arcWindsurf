/**
 * Session CRUD operations
 * GET /sessions/:id
 * POST /sessions
 * DELETE /sessions/:id
 */
import type { Context } from 'hono';
import {
  createSession,
  getSession,
  deleteSession,
  getPromptTag,
  createSessionTagBinding,
} from '../../../db/sessionsClient.js';
import { db } from '../../../db/prismaClient.js';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import type { CreateSessionResponse } from '../../../services/types.js';
import { notFound, badRequest, serverError } from '../../../utils/responses.js';
import { generateId, generateInstanceId } from '@minimal-rpg/utils';
import { findCharacter, findSetting, isCreateSessionRequest } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';

export async function handleGetSession(c: Context): Promise<Response> {
  const id = c.req.param('id');
  const ownerEmail = getOwnerEmail(c);
  const session = await getSession(ownerEmail, id);
  if (!session) return notFound(c, 'session not found');

  // ensure chronological order by createdAt (ISO strings compare lexicographically)
  const sorted = {
    ...session,
    messages: [...session.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };

  return c.json(sorted, 200);
}

export async function handleCreateSession(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  console.log('[API] POST /sessions request received');
  const loaded = getLoaded();
  if (!loaded) {
    console.error('[API] Data not loaded');
    return serverError(c, 'data not loaded');
  }

  const rawBody: unknown = await c.req.json().catch(() => null);
  console.log('[API] Request body:', rawBody);
  if (!isCreateSessionRequest(rawBody)) {
    return badRequest(c, 'characterId and settingId are required');
  }

  const { characterId, settingId, tagIds } = rawBody;
  const character = await findCharacter(loaded, characterId);
  const setting = await findSetting(loaded, settingId);

  if (!character || !setting) {
    console.error('[API] Character or setting not found:', { characterId, settingId });
    return badRequest(c, 'characterId or settingId not found');
  }

  const sessionId = generateId();
  const characterInstanceId = generateInstanceId(character.id);
  const settingInstanceId = generateInstanceId(setting.id);

  console.log('[API] Creating session:', sessionId);
  const sessionRecord = await createSession(ownerEmail, sessionId, character.id, setting.id);

  try {
    console.log('[API] Creating character instance:', characterInstanceId);
    await db.characterInstance.create({
      data: {
        id: characterInstanceId,
        sessionId: sessionRecord.id,
        templateId: character.id,
        templateSnapshot: JSON.stringify(character),
        profileJson: JSON.stringify(character),
        overridesJson: JSON.stringify({}),
        role: 'primary',
        ownerEmail,
      },
    });

    console.log('[API] Creating setting instance:', settingInstanceId);
    await db.settingInstance.create({
      data: {
        id: settingInstanceId,
        sessionId: sessionRecord.id,
        templateId: setting.id,
        templateSnapshot: JSON.stringify(setting),
        profileJson: JSON.stringify(setting),
        ownerEmail,
      },
    });

    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      console.log('[API] Creating tag bindings:', tagIds.length);
      for (const tid of tagIds) {
        if (typeof tid === 'string') {
          // Verify tag exists before creating binding
          const t = await getPromptTag(tid, 'admin');
          if (t) {
            await createSessionTagBinding(ownerEmail, {
              sessionId: sessionRecord.id,
              tagId: tid,
              targetType: 'session',
              enabled: true,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[API] Failed to create session instances, rolling back session', err);
    await deleteSession(ownerEmail, sessionRecord.id).catch(() => undefined);
    return serverError(c, 'failed to create session instances');
  }

  const response: CreateSessionResponse = {
    id: sessionRecord.id,
    characterTemplateId: sessionRecord.characterTemplateId,
    characterInstanceId,
    settingTemplateId: sessionRecord.settingTemplateId,
    settingInstanceId,
    createdAt: sessionRecord.createdAt,
  };
  console.log('[API] Session created successfully');
  return c.json(response, 201);
}

export async function handleDeleteSession(c: Context): Promise<Response> {
  const id = c.req.param('id');
  const ownerEmail = getOwnerEmail(c);
  const session = await getSession(ownerEmail, id);
  if (!session) return notFound(c, 'session not found');

  await deleteSession(ownerEmail, id);
  return c.body(null, 204);
}
