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
} from '@minimal-rpg/db/node';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import { notFound, badRequest, serverError } from '../../../utils/responses.js';
import { jsonifyBigInts } from '../../../utils/json.js';
import { generateId } from '@minimal-rpg/utils';
import { CreateSessionRequestSchema, findCharacter, findSetting } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toId, toSessionId } from '../../../utils/uuid.js';
import { primeSessionSequence } from '../../../services/event-persistence.js';
import { mapSpokeEventsToMessages } from './message-mapping.js';
import { createMessageMappingDeps } from './message-mapping-deps.js';
import { validateBody, validateParamId } from '../../../utils/request-validation.js';

type DbEvent = Awaited<ReturnType<typeof getEventsForSession>>[number];
type SpokeEventRecord = DbEvent & { actorId: string; type: 'SPOKE' };

export async function handleGetSession(c: Context): Promise<Response> {
  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;
  const ownerEmail = getOwnerEmail(c);
  // getSession(id, ownerEmail) is from @minimal-rpg/db/node (sessions repository)
  const session = await getSession(toSessionId(id), ownerEmail);
  if (!session) return notFound(c, 'session not found');

  const projection = await getSessionProjection(toSessionId(id));

  // Fetch messages from events
  const allEvents = await getEventsForSession(toSessionId(id));
  primeSessionSequence(id, allEvents);
  const spokeEvents: SpokeEventRecord[] = allEvents.filter(
    (event): event is SpokeEventRecord => event.type === 'SPOKE' && typeof event.actorId === 'string'
  );

  const messages = await mapSpokeEventsToMessages(spokeEvents, createMessageMappingDeps(id));

  return c.json(jsonifyBigInts({ ...session, projection, messages }), 200);
}

export async function handleCreateSession(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  console.info('[API] POST /sessions request received');
  const loaded = getLoaded();
  if (!loaded) {
    console.error('[API] Data not loaded');
    return serverError(c, 'data not loaded');
  }

  const bodyResult = await validateBody(c, CreateSessionRequestSchema);
  if (!bodyResult.success) return bodyResult.errorResponse;

  const { characterId, settingId, tagIds } = bodyResult.data;
  const character = await findCharacter(loaded, characterId);
  const setting = await findSetting(loaded, settingId);

  if (!character || !setting) {
    console.error('[API] Character or setting not found:', { characterId, settingId });
    return badRequest(c, 'characterId or settingId not found');
  }

  const sessionId = toSessionId(generateId());

  console.info('[API] Creating session:', sessionId);
  const sessionRecord = await createSession({
    id: sessionId,
    ownerEmail,
    characterTemplateId: character.id,
    settingTemplateId: setting.id,
  });

  if (!sessionRecord) {
    return serverError(c, 'failed to create session');
  }

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
      console.info('[API] Creating tag bindings:', tagIds.length);
      for (const tid of tagIds) {
        if (typeof tid === 'string') {
          const t = await getPromptTag(tid);
          if (t) {
            await createSessionTagBinding(ownerEmail, {
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

  console.info('[API] Session created successfully');
  return c.json(response, 201);
}

export async function handleDeleteSession(c: Context): Promise<Response> {
  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;
  const ownerEmail = getOwnerEmail(c);
  await deleteSession(toSessionId(id), ownerEmail);
  return c.body(null, 204);
}
