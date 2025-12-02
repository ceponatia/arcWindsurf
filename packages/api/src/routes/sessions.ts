import type { Hono } from 'hono';
import { randomUUID } from 'node:crypto';

import {
  createSession,
  getSession,
  appendMessage,
  listSessions,
  deleteSession,
} from '../db/sessionsClient.js';
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import {
  getEffectiveProfiles,
  upsertCharacterOverrides,
  upsertSettingOverrides,
  getEffectiveCharacter,
  getEffectiveSetting,
} from '../sessions/instances.js';
import { buildPrompt } from '../llm/prompt.js';
import { generateWithOpenRouter as rawGenerateWithOpenRouter } from '../llm/openrouter.js';
import { db } from '../db/prismaClient.js';
import type {
  LoadedDataGetter,
  CreateSessionRequest,
  CreateSessionResponse,
  MessageRequest,
  MessageResponseBody,
  SessionListItem,
  ApiError,
  EffectiveProfilesResponse,
  OverridesAudit,
  LlmResponse,
  LoadedData,
  GenerateWithOpenRouterFn,
} from '../types.js';
import { mapSessionListItem } from '../mappers/sessionMappers.js';
import { getConfig } from '../util/config.js';

const generateWithOpenRouter = rawGenerateWithOpenRouter as GenerateWithOpenRouterFn;

interface SessionRouteDeps {
  getLoaded: LoadedDataGetter;
}

function isMessageRequest(body: unknown): body is MessageRequest {
  return Boolean(
    body && typeof body === 'object' && typeof (body as { content?: unknown }).content === 'string'
  );
}

function isCreateSessionRequest(body: unknown): body is CreateSessionRequest {
  if (!body || typeof body !== 'object') return false;
  const { characterId, settingId } = body as {
    characterId?: unknown;
    settingId?: unknown;
  };
  return typeof characterId === 'string' && typeof settingId === 'string';
}

function safeRandomId(): string {
  try {
    return randomUUID();
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

async function findCharacter(loaded: LoadedData, id: string) {
  const fsChar = loaded.characters.find((c) => c.id === id);
  if (fsChar) return fsChar;

  const dbChar = await db.characterProfile.findUnique({
    where: { id },
  });
  if (dbChar) {
    try {
      return CharacterProfileSchema.parse(JSON.parse(dbChar.profileJson));
    } catch {
      return null;
    }
  }
  return null;
}

async function findSetting(loaded: LoadedData, id: string) {
  const fsSet = loaded.settings.find((s) => s.id === id);
  if (fsSet) return fsSet;

  const dbSet = await db.settingProfile.findUnique({
    where: { id },
  });
  if (dbSet) {
    try {
      return SettingProfileSchema.parse(JSON.parse(dbSet.profileJson));
    } catch {
      return null;
    }
  }
  return null;
}

export function registerSessionRoutes(app: Hono, deps: SessionRouteDeps): void {
  // GET /sessions - list existing sessions with display-friendly names
  app.get('/sessions', async (c) => {
    const sessions = await listSessions();
    const loaded = deps.getLoaded();
    if (!loaded) return c.json(sessions, 200);

    const dbChars = await db.characterProfile.findMany();
    const dbSettings = await db.settingProfile.findMany();

    const decorated: SessionListItem[] = await Promise.all(
      sessions.map(async (sess) => {
        let characterName: string | undefined;
        let settingName: string | undefined;

        const fsCharacter = loaded.characters.find((ch) => ch.id === sess.characterTemplateId);
        if (fsCharacter) {
          characterName = fsCharacter.name;
        } else {
          const t = dbChars.find((t) => t.id === sess.characterTemplateId);
          if (t) {
            try {
              characterName = CharacterProfileSchema.parse(JSON.parse(t.profileJson)).name;
            } catch {
              // ignore invalid profile
            }
          } else if (sess.characterInstanceId) {
            const instance = await db.characterInstance.findUnique({
              where: { sessionId: sess.id },
            });
            if (instance) {
              try {
                const parsed = CharacterProfileSchema.parse(JSON.parse(instance.profileJson));
                characterName = parsed.name;
              } catch {
                // ignore invalid profile
              }
            }
          }
        }

        const fsSetting = loaded.settings.find((s) => s.id === sess.settingTemplateId);
        if (fsSetting) {
          settingName = fsSetting.name;
        } else {
          const t = dbSettings.find((t) => t.id === sess.settingTemplateId);
          if (t) {
            try {
              settingName = SettingProfileSchema.parse(JSON.parse(t.profileJson)).name;
            } catch {
              // ignore invalid profile
            }
          } else if (sess.settingInstanceId) {
            const instance = await db.settingInstance.findUnique({ where: { sessionId: sess.id } });
            if (instance) {
              try {
                const parsed = SettingProfileSchema.parse(JSON.parse(instance.profileJson));
                settingName = parsed.name;
              } catch {
                // ignore invalid profile
              }
            }
          }
        }

        return mapSessionListItem(sess, characterName, settingName);
      })
    );

    return c.json(decorated, 200);
  });

  // GET /sessions/:id - return full conversation
  app.get('/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);

    // ensure chronological order by createdAt (ISO strings compare lexicographically)
    const sorted = {
      ...session,
      messages: [...session.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };

    return c.json(sorted, 200);
  });

  // GET /sessions/:id/effective - merged effective character + setting for the session
  app.get('/sessions/:id/effective', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);

    const character = await findCharacter(loaded, session.characterTemplateId);
    const setting = await findSetting(loaded, session.settingTemplateId);
    if (!character || !setting) {
      return c.json(
        { ok: false, error: 'character or setting not found for session' } satisfies ApiError,
        500
      );
    }

    const effective = await getEffectiveProfiles(session.id, character, setting);
    return c.json(effective satisfies EffectiveProfilesResponse, 200);
  });

  // PUT /sessions/:id/overrides/character - upsert character overrides for the session
  app.put('/sessions/:id/overrides/character', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);

    const character = await findCharacter(loaded, session.characterTemplateId);
    if (!character) {
      return c.json(
        { ok: false, error: 'character not found for session' } satisfies ApiError,
        500
      );
    }

    const body: unknown = await c.req.json().catch(() => null);
    const overrides =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;

    if (!overrides || Array.isArray(overrides)) {
      return c.json({ ok: false, error: 'overrides must be an object' } satisfies ApiError, 400);
    }

    const audit = await upsertCharacterOverrides({
      sessionId: session.id,
      characterId: character.id,
      baseline: character,
      overrides,
    });

    const effective = await getEffectiveCharacter(session.id, character);
    return c.json(
      { effective, audit } satisfies {
        effective: CharacterProfile;
        audit: OverridesAudit;
      },
      200
    );
  });

  // PUT /sessions/:id/overrides/setting - upsert setting overrides for the session
  app.put('/sessions/:id/overrides/setting', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);

    const setting = await findSetting(loaded, session.settingTemplateId);
    if (!setting) {
      return c.json({ ok: false, error: 'setting not found for session' } satisfies ApiError, 500);
    }

    const body: unknown = await c.req.json().catch(() => null);
    const overrides =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;

    if (!overrides || Array.isArray(overrides)) {
      return c.json({ ok: false, error: 'overrides must be an object' } satisfies ApiError, 400);
    }

    const audit = await upsertSettingOverrides({
      sessionId: session.id,
      settingId: setting.id,
      baseline: setting,
      overrides,
    });

    const effective = await getEffectiveSetting(session.id, setting);
    return c.json(
      { effective, audit } satisfies {
        effective: SettingProfile;
        audit: OverridesAudit;
      },
      200
    );
  });

  // PATCH /sessions/:id/messages/:idx - update a message content
  app.patch('/sessions/:id/messages/:idx', async (c) => {
    const id = c.req.param('id');
    const idx = parseInt(c.req.param('idx'), 10);
    if (isNaN(idx)) return c.json({ ok: false, error: 'invalid index' } satisfies ApiError, 400);

    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);

    const rawBody: unknown = await c.req.json().catch(() => null);
    if (!isMessageRequest(rawBody)) {
      return c.json(
        { ok: false, error: 'content must be 1..4000 characters' } satisfies ApiError,
        400
      );
    }
    const { content } = rawBody;
    if (content.length < 1 || content.length > 4000) {
      return c.json(
        { ok: false, error: 'content must be 1..4000 characters' } satisfies ApiError,
        400
      );
    }

    const updated = await db.message.update({
      where: { sessionId: id, idx },
      data: { content },
    });

    if (!updated) {
      return c.json({ ok: false, error: 'message not found' } satisfies ApiError, 404);
    }

    return c.body(null, 204);
  });

  // DELETE /sessions/:id/messages/:idx - delete a single message
  app.delete('/sessions/:id/messages/:idx', async (c) => {
    const id = c.req.param('id');
    const idx = parseInt(c.req.param('idx'), 10);
    if (isNaN(idx)) return c.json({ ok: false, error: 'invalid index' } satisfies ApiError, 400);

    console.info(`[API] Request to delete message: session=${id}, idx=${idx}`);

    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);

    const existing = await db.message.findFirst({ where: { sessionId: id, idx } });
    if (!existing) {
      return c.json({ ok: false, error: 'message not found' } satisfies ApiError, 404);
    }

    await db.message.deleteMany({ where: { sessionId: id, idx } });
    return c.body(null, 204);
  });

  // POST /sessions/:id/messages - append a user message and get LLM reply
  app.post('/sessions/:id/messages', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) {
      return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);
    }

    const rawBody: unknown = await c.req.json().catch(() => null);
    if (!isMessageRequest(rawBody)) {
      return c.json(
        { ok: false, error: 'content must be 1..4000 characters' } satisfies ApiError,
        400
      );
    }

    const { content } = rawBody;
    if (content.length < 1 || content.length > 4000) {
      return c.json(
        { ok: false, error: 'content must be 1..4000 characters' } satisfies ApiError,
        400
      );
    }

    await appendMessage(session.id, 'user', content);
    console.info(`Session ${session.id}: user message (${content.length} chars) queued`);

    const loaded2 = deps.getLoaded();
    if (!loaded2) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const character = await findCharacter(loaded2, session.characterTemplateId);
    const setting = await findSetting(loaded2, session.settingTemplateId);

    if (!character || !setting) {
      return c.json(
        { ok: false, error: 'character or setting not found for session' } satisfies ApiError,
        500
      );
    }

    const cfg = getConfig();
    if (!cfg.openrouterApiKey || !cfg.openrouterModel) {
      return c.json(
        { ok: false, error: 'Missing OPENROUTER_API_KEY or OPENROUTER_MODEL env vars' },
        500
      );
    }

    const sessAfterUser = await getSession(session.id);
    const history = sessAfterUser?.messages ?? session.messages;

    const effective = await getEffectiveProfiles(session.id, character, setting);
    const messages = buildPrompt({
      character: effective.character,
      setting: effective.setting,
      history,
      historyWindow: cfg.contextWindow,
    });

    console.info(
      `Session ${session.id}: calling OpenRouter model ${cfg.openrouterModel} with ${messages.length} messages`
    );

    const result = await generateWithOpenRouter(
      {
        apiKey: cfg.openrouterApiKey,
        model: cfg.openrouterModel,
        messages,
      },
      { temperature: cfg.temperature, top_p: cfg.topP }
    );

    if ('ok' in result && result.ok === false) {
      const errStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      console.error(`Session ${session.id}: OpenRouter error -> ${errStr}`);
      return c.json({ ok: false, error: result.error } satisfies ApiError, 502);
    }

    const llm = result as LlmResponse; // narrowed after error branch
    const contentReplyRaw = llm.content ?? '';
    const contentReply = contentReplyRaw.trim();
    if (!contentReply) {
      return c.json(
        { ok: false, error: 'Empty assistant response from OpenRouter' } satisfies ApiError,
        502
      );
    }

    await appendMessage(session.id, 'assistant', contentReply);
    const sessAfterAssistant = await getSession(session.id);
    const last = sessAfterAssistant?.messages.at(-1);

    console.info(`Session ${session.id}: assistant reply (${contentReply.length} chars) stored`);

    const messageDto: MessageResponseBody['message'] = last
      ? {
          role: last.role,
          content: last.content,
          createdAt: last.createdAt,
          idx: last.idx,
        }
      : { role: 'assistant', content: contentReply, createdAt: new Date().toISOString() };
    const body: MessageResponseBody = { message: messageDto };
    return c.json(body, 200);
  });

  // POST /sessions - create a new session for characterId + settingId
  app.post('/sessions', async (c) => {
    console.log('[API] POST /sessions request received');
    const loaded = deps.getLoaded();
    if (!loaded) {
      console.error('[API] Data not loaded');
      return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);
    }

    const rawBody: unknown = await c.req.json().catch(() => null);
    console.log('[API] Request body:', rawBody);
    if (!isCreateSessionRequest(rawBody)) {
      return c.json(
        { ok: false, error: 'characterId and settingId are required' } satisfies ApiError,
        400
      );
    }

    const { characterId, settingId } = rawBody;
    const character = await findCharacter(loaded, characterId);
    const setting = await findSetting(loaded, settingId);

    if (!character || !setting) {
      console.error('[API] Character or setting not found:', { characterId, settingId });
      return c.json(
        { ok: false, error: 'characterId or settingId not found' } satisfies ApiError,
        400
      );
    }

    const sessionId = safeRandomId();
    const characterInstanceId = `${character.id}-${safeRandomId()}`;
    const settingInstanceId = `${setting.id}-${safeRandomId()}`;

    console.log('[API] Creating session:', sessionId);
    const sessionRecord = await createSession(sessionId, character.id, setting.id);

    try {
      console.log('[API] Creating character instance:', characterInstanceId);
      await db.characterInstance.create({
        data: {
          id: characterInstanceId,
          sessionId: sessionRecord.id,
          templateId: character.id,
          templateSnapshot: JSON.stringify(character),
          profileJson: JSON.stringify(character),
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
        },
      });
    } catch (err) {
      console.error('[API] Failed to create session instances, rolling back session', err);
      await deleteSession(sessionRecord.id).catch(() => undefined);
      return c.json(
        { ok: false, error: 'failed to create session instances' } satisfies ApiError,
        500
      );
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
  });

  // DELETE /sessions/:id - delete a session
  app.delete('/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);

    await deleteSession(id);
    return c.body(null, 204);
  });
}
