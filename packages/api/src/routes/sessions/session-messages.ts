/**
 * Session message operations
 * POST /sessions/:id/messages - append user message and get LLM reply
 * PATCH /sessions/:id/messages/:idx - update message content
 * DELETE /sessions/:id/messages/:idx - delete a message
 */
import type { Context } from 'hono';
import {
  getSession,
  appendMessage,
  getSessionTagsWithDefinitions,
} from '../../db/sessionsClient.js';
import { db } from '../../db/prismaClient.js';
import type { LoadedDataGetter } from '../../data/types.js';
import type { MessageResponseBody } from '../../sessions/types.js';
import type { LlmResponse } from '../../llm/types.js';
import { getConfig } from '../../util/config.js';
import { buildPrompt } from '../../llm/prompt.js';
import { generateWithOpenRouter } from '../../llm/openrouter.js';
import { getEffectiveProfiles } from '../../sessions/index.js';
import { notFound, badRequest, serverError } from '../../util/responses.js';
import { findCharacter, findSetting, isMessageRequest } from './shared.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';

export async function handlePostMessage(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  const loaded = getLoaded();
  if (!loaded) return serverError(c, 'data not loaded');

  const ownerEmail = getOwnerEmail(c);
  const id = c.req.param('id');
  const session = await getSession(ownerEmail, id);
  if (!session) return notFound(c, 'session not found');

  const rawBody: unknown = await c.req.json().catch(() => null);
  if (!isMessageRequest(rawBody)) {
    return badRequest(c, 'content must be 1..4000 characters');
  }

  const { content } = rawBody;
  if (content.length < 1 || content.length > 4000) {
    return badRequest(c, 'content must be 1..4000 characters');
  }

  await appendMessage(ownerEmail, session.id, 'user', content);
  console.info(`Session ${session.id}: user message (${content.length} chars) queued`);

  const loaded2 = getLoaded();
  if (!loaded2) return serverError(c, 'data not loaded');

  const character = await findCharacter(loaded2, session.characterTemplateId);
  const setting = await findSetting(loaded2, session.settingTemplateId);

  if (!character || !setting) {
    return serverError(c, 'character or setting not found for session');
  }

  const cfg = getConfig();
  if (!cfg.openrouterApiKey || !cfg.openrouterModel) {
    return serverError(c, 'Missing OPENROUTER_API_KEY or OPENROUTER_MODEL env vars');
  }

  const sessAfterUser = await getSession(ownerEmail, session.id);
  const history = sessAfterUser?.messages ?? session.messages;

  // Get active tags for this session (only enabled, always-mode for now)
  const tagBindingsWithDefs = await getSessionTagsWithDefinitions(ownerEmail, session.id, {
    enabledOnly: true,
  });
  const tagInstances = tagBindingsWithDefs
    .filter((b) => b.tag.activation_mode === 'always') // Only always-mode tags for now
    .map((b) => ({
      id: b.id,
      sessionId: b.session_id,
      tagId: b.tag_id,
      name: b.tag.name,
      promptText: b.tag.prompt_text,
      shortDescription: b.tag.short_description ?? undefined,
      createdAt: b.created_at,
    }));

  const effective = await getEffectiveProfiles(session.id, character, setting);
  const messages = buildPrompt({
    character: effective.character,
    setting: effective.setting,
    history,
    historyWindow: cfg.contextWindow,
    tagInstances,
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
    return c.json({ ok: false, error: result.error }, 502);
  }

  const llm = result as LlmResponse; // narrowed after error branch
  const contentReplyRaw = llm.content ?? '';
  const contentReply = contentReplyRaw.trim();
  if (!contentReply) {
    return c.json({ ok: false, error: 'Empty assistant response from OpenRouter' }, 502);
  }

  await appendMessage(ownerEmail, session.id, 'assistant', contentReply);
  const sessAfterAssistant = await getSession(ownerEmail, session.id);
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
}

export async function handlePatchMessage(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const id = c.req.param('id');
  const idx = parseInt(c.req.param('idx'), 10);
  if (isNaN(idx)) return badRequest(c, 'invalid index');

  const session = await getSession(ownerEmail, id);
  if (!session) return notFound(c, 'session not found');

  const rawBody: unknown = await c.req.json().catch(() => null);
  if (!isMessageRequest(rawBody)) {
    return badRequest(c, 'content must be 1..4000 characters');
  }
  const { content } = rawBody;
  if (content.length < 1 || content.length > 4000) {
    return badRequest(c, 'content must be 1..4000 characters');
  }

  const updated = await db.message.update({
    where: { sessionId: id, idx },
    data: { content },
  });

  if (!updated) {
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

  const session = await getSession(ownerEmail, id);
  if (!session) return notFound(c, 'session not found');

  const existing = await db.message.findFirst({ where: { sessionId: id, idx } });
  if (!existing) {
    return notFound(c, 'message not found');
  }

  await db.message.deleteMany({ where: { sessionId: id, idx } });
  return c.body(null, 204);
}
