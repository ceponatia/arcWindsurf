import type { Hono } from 'hono';
import { randomUUID } from 'node:crypto';

import {
  createSession,
  getSession,
  appendMessage,
  listSessions,
  deleteSession,
  prisma,
} from '@minimal-rpg/db/node';
import { CharacterProfileSchema, SettingProfileSchema } from '@minimal-rpg/schemas';
import {
  getEffectiveProfiles,
  upsertCharacterOverrides,
  upsertSettingOverrides,
  getEffectiveCharacter,
  getEffectiveSetting,
} from '../sessions/instances.js';
import { buildPrompt } from '../llm/prompt.js';
import { chatWithOpenRouter } from '../llm/openrouter.js';
import { getConfig } from '../util/config.js';
import type { LoadedData } from '../data/loader.js';

interface SessionRouteDeps {
  getLoaded: () => LoadedData | undefined;
}

interface MessageRequestBody {
  content: string;
}

interface CreateSessionRequestBody {
  characterId: string;
  settingId: string;
}

function isMessageRequest(body: unknown): body is MessageRequestBody {
  return Boolean(
    body && typeof body === 'object' && typeof (body as { content?: unknown }).content === 'string'
  );
}

function isCreateSessionRequest(body: unknown): body is CreateSessionRequestBody {
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

  const dbChar = await prisma.characterTemplate.findUnique({ where: { id } });
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

  const dbSet = await prisma.settingTemplate.findUnique({ where: { id } });
  if (dbSet) {
    try {
      return SettingProfileSchema.parse(JSON.parse(dbSet.profileJson));
    } catch {
      return null;
    }
  }
  return null;
}

export function registerSessionRoutes(app: Hono, deps: SessionRouteDeps) {
  // GET /sessions - list existing sessions with display-friendly names
  app.get('/sessions', async (c) => {
    const sessions = await listSessions();
    const loaded = deps.getLoaded();
    if (!loaded) return c.json(sessions, 200);

    const dbChars = await prisma.characterTemplate.findMany();
    const dbSettings = await prisma.settingTemplate.findMany();

    const decorated = sessions.map((sess) => {
      let character = loaded.characters.find((ch) => ch.id === sess.characterId);
      if (!character) {
        const t = dbChars.find((t) => t.id === sess.characterId);
        if (t) {
          try {
            character = CharacterProfileSchema.parse(JSON.parse(t.profileJson));
          } catch {
            // ignore invalid profile
          }
        }
      }

      let setting = loaded.settings.find((s) => s.id === sess.settingId);
      if (!setting) {
        const t = dbSettings.find((t) => t.id === sess.settingId);
        if (t) {
          try {
            setting = SettingProfileSchema.parse(JSON.parse(t.profileJson));
          } catch {
            // ignore invalid profile
          }
        }
      }

      return {
        ...sess,
        characterName: character?.name,
        settingName: setting?.name,
      };
    });

    return c.json(decorated, 200);
  });

  // GET /sessions/:id - return full conversation
  app.get('/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' }, 404);

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
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' }, 404);

    const character = await findCharacter(loaded, session.characterId);
    const setting = await findSetting(loaded, session.settingId);
    if (!character || !setting) {
      return c.json({ ok: false, error: 'character or setting not found for session' }, 500);
    }

    const effective = await getEffectiveProfiles(session.id, character, setting);
    return c.json(effective, 200);
  });

  // PUT /sessions/:id/overrides/character - upsert character overrides for the session
  app.put('/sessions/:id/overrides/character', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' }, 404);

    const character = await findCharacter(loaded, session.characterId);
    if (!character) {
      return c.json({ ok: false, error: 'character not found for session' }, 500);
    }

    const body: unknown = await c.req.json().catch(() => null);
    const overrides =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;

    if (!overrides || Array.isArray(overrides)) {
      return c.json({ ok: false, error: 'overrides must be an object' }, 400);
    }

    const audit = await upsertCharacterOverrides({
      sessionId: session.id,
      characterId: character.id,
      baseline: character,
      overrides,
    });

    const effective = await getEffectiveCharacter(session.id, character);
    return c.json({ effective, audit }, 200);
  });

  // PUT /sessions/:id/overrides/setting - upsert setting overrides for the session
  app.put('/sessions/:id/overrides/setting', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' }, 404);

    const setting = await findSetting(loaded, session.settingId);
    if (!setting) {
      return c.json({ ok: false, error: 'setting not found for session' }, 500);
    }

    const body: unknown = await c.req.json().catch(() => null);
    const overrides =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;

    if (!overrides || Array.isArray(overrides)) {
      return c.json({ ok: false, error: 'overrides must be an object' }, 400);
    }

    const audit = await upsertSettingOverrides({
      sessionId: session.id,
      settingId: setting.id,
      baseline: setting,
      overrides,
    });

    const effective = await getEffectiveSetting(session.id, setting);
    return c.json({ effective, audit }, 200);
  });

  // POST /sessions/:id/messages - append a user message and get LLM reply
  app.post('/sessions/:id/messages', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) {
      return c.json({ ok: false, error: 'session not found' }, 404);
    }

    const rawBody: unknown = await c.req.json().catch(() => null);
    if (!isMessageRequest(rawBody)) {
      return c.json({ ok: false, error: 'content must be 1..4000 characters' }, 400);
    }

    const { content } = rawBody;
    if (content.length < 1 || content.length > 4000) {
      return c.json({ ok: false, error: 'content must be 1..4000 characters' }, 400);
    }

    await appendMessage(session.id, 'user', content);
    console.info(`Session ${session.id}: user message (${content.length} chars) queued`);

    const loaded2 = deps.getLoaded();
    if (!loaded2) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const character = await findCharacter(loaded2, session.characterId);
    const setting = await findSetting(loaded2, session.settingId);

    if (!character || !setting) {
      return c.json({ ok: false, error: 'character or setting not found for session' }, 500);
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

    const result = await chatWithOpenRouter({
      apiKey: cfg.openrouterApiKey,
      model: cfg.openrouterModel,
      messages,
      options: { temperature: cfg.temperature, top_p: cfg.topP },
    });

    if (result.error) {
      console.error(`Session ${session.id}: OpenRouter error -> ${result.error}`);
      return c.json({ ok: false, error: result.error }, 502);
    }

    const contentReply = result.message?.content ?? '';
    if (!contentReply.trim()) {
      return c.json({ ok: false, error: 'Empty assistant response from OpenRouter' }, 502);
    }

    await appendMessage(session.id, 'assistant', contentReply);
    const sessAfterAssistant = await getSession(session.id);
    const last = sessAfterAssistant?.messages.at(-1);

    console.info(`Session ${session.id}: assistant reply (${contentReply.length} chars) stored`);

    return c.json(
      {
        message: last ?? {
          role: 'assistant',
          content: contentReply,
          createdAt: new Date().toISOString(),
        },
      },
      200
    );
  });

  // POST /sessions - create a new session for characterId + settingId
  app.post('/sessions', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) return c.json({ ok: false, error: 'data not loaded' }, 500);

    const rawBody: unknown = await c.req.json().catch(() => null);
    if (!isCreateSessionRequest(rawBody)) {
      return c.json({ ok: false, error: 'characterId and settingId are required' }, 400);
    }

    const { characterId, settingId } = rawBody;
    const character = await findCharacter(loaded, characterId);
    const setting = await findSetting(loaded, settingId);

    if (!character || !setting) {
      return c.json({ ok: false, error: 'characterId or settingId not found' }, 400);
    }

    const id = safeRandomId();
    const session = await createSession(id, characterId, settingId);

    const response = {
      id: session.id,
      characterId: session.characterId,
      settingId: session.settingId,
      createdAt: session.createdAt,
    };

    return c.json(response, 201);
  });

  // DELETE /sessions/:id - delete a session
  app.delete('/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) return c.json({ ok: false, error: 'session not found' }, 404);

    await deleteSession(id);
    return c.body(null, 204);
  });
}
