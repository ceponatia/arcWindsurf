import type { Context } from 'hono';
import {
  createSession,
  getSession,
  deleteSession,
  getPromptTag,
  createSessionTagBinding,
  upsertActorState,
  getSessionProjection,
  getEventsForSession,
  getEntityProfile,
} from '@minimal-rpg/db/node';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import type { CreateSessionResponse } from '../../../services/types.js';
import { notFound, badRequest, serverError } from '../../../utils/responses.js';
import { generateId } from '@minimal-rpg/utils';
import { findCharacter, findSetting, isCreateSessionRequest } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toId, toSessionId } from '../../../utils/uuid.js';

interface SpokePayload {
  content?: string;
  entityProfileId?: string;
}

export async function handleGetSession(c: Context): Promise<Response> {
  const id = c.req.param('id');
  const ownerEmail = getOwnerEmail(c);
  // getSession(id, ownerEmail) is from @minimal-rpg/db/node (sessions repository)
  const session = await getSession(toSessionId(id), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const projection = await getSessionProjection(toSessionId(id));

  // Fetch messages from events
  const allEvents = await getEventsForSession(toSessionId(id));
  const spokeEvents = allEvents.filter((e) => e.type === 'SPOKE');
  const messages = await Promise.all(
    spokeEvents.map(async (e) => {
      const payload = e.payload as SpokePayload;
      let speaker;
      if (e.actorId && e.actorId !== 'player') {
        const profileId = payload.entityProfileId ?? e.actorId;
        const profile = profileId ? await getEntityProfile(toId(profileId)) : null;
        if (profile) {
          speaker = {
            id: e.actorId,
            name: profile.name,
          };
        }
      }

      return {
        role: e.actorId === 'player' ? 'user' : 'assistant',
        content: payload.content ?? '',
        createdAt: e.createdAt.toISOString(),
        idx: Number(e.sequence),
        speaker,
      };
    })
  );

  return c.json({ ...session, projection, messages }, 200);
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

  const sessionId = toSessionId(generateId());

  console.log('[API] Creating session:', sessionId);
  const sessionRecord = await createSession({
    id: sessionId,
    ownerEmail,
    characterTemplateId: character.id,
    settingTemplateId: setting.id,
  });

  try {
    // Replaced legacy instance creation with primary actor state
    await upsertActorState({
      sessionId: toSessionId(sessionRecord.id),
      actorType: 'player',
      actorId: 'player',
      entityProfileId: toId(character.id),
      state: { status: 'active' },
      lastEventSeq: 0n,
    });

    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      console.log('[API] Creating tag bindings:', tagIds.length);
      for (const tid of tagIds) {
        if (typeof tid === 'string') {
          const t = await getPromptTag(tid);
          if (t) {
            await createSessionTagBinding({
              sessionId: sessionRecord.id,
              tagId: tid,
              enabled: true,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[API] Failed to prepare session state, rolling back session', err);
    await deleteSession(sessionRecord.id, ownerEmail).catch(() => undefined);
    return serverError(c, 'failed to create session instances');
  }

  const response = {
    id: sessionRecord.id,
    playerCharacterId: sessionRecord.playerCharacterId ?? character.id,
    settingId: sessionRecord.settingId ?? setting.id,
    createdAt: sessionRecord.createdAt.toISOString(),
  };

  console.log('[API] Session created successfully');
  return c.json(response, 201);
}

export async function handleDeleteSession(c: Context): Promise<Response> {
  const id = c.req.param('id');
  const ownerEmail = getOwnerEmail(c);
  await deleteSession(toSessionId(id), ownerEmail);
  return c.body(null, 204);
}
