import type { Hono } from 'hono';

import { getSession } from '../db/sessionsClient.js';
import type { LoadedDataGetter, ApiError, TurnResultDto } from '../types.js';
import { createGovernorForRequest } from '../governor/composition.js';
import type { TurnStateContext, ConversationTurn, StateObject } from '@minimal-rpg/governor';

interface TurnRouteDeps {
  getLoaded: LoadedDataGetter;
}

interface TurnRequestBody {
  input: string;
}

function isTurnRequestBody(body: unknown): body is TurnRequestBody {
  return Boolean(
    body &&
      typeof body === 'object' &&
      typeof (body as { input?: unknown }).input === 'string' &&
      (body as { input: string }).input.length > 0
  );
}

export function registerTurnRoutes(app: Hono, deps: TurnRouteDeps): void {
  // Minimal happy-path governor-backed turn endpoint.
  // POST /sessions/:id/turns { input: string }
  app.post('/sessions/:id/turns', async (c) => {
    const loaded = deps.getLoaded();
    if (!loaded) {
      return c.json({ ok: false, error: 'data not loaded' } satisfies ApiError, 500);
    }

    const id = c.req.param('id');
    const session = await getSession(id);
    if (!session) {
      return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);
    }

    const rawBody: unknown = await c.req.json().catch(() => null);
    if (!isTurnRequestBody(rawBody)) {
      return c.json({ ok: false, error: 'input is required' } satisfies ApiError, 400);
    }

    const { input } = rawBody;

    // Minimal happy path: build a very small baseline state from templates.
    // For now we only support filesystem-backed character/setting profiles.
    const character = loaded.characters.find((c) => c.id === session.characterTemplateId);
    const setting = loaded.settings.find((s) => s.id === session.settingTemplateId);

    if (!character || !setting) {
      return c.json(
        { ok: false, error: 'character or setting not found for session' } satisfies ApiError,
        500
      );
    }

    // Baseline TurnStateContext – pull only the minimal slices we need for
    // move/look/talk/use intents.
    const baseline: TurnStateContext = {
      character: {
        name: character.name,
        summary: character.summary,
      },
      setting: {
        name: setting.name,
      },
      // For the first happy path we assume the active location and
      // inventory are encoded directly on the setting/character profiles.
      location: ((setting as { location?: StateObject }).location ?? {}) as StateObject,
      inventory: ((character as { inventory?: StateObject }).inventory ?? {}) as StateObject,
    };

    const overrides = {};

    const governor = createGovernorForRequest();

    const turnResult = await governor.handleTurn({
      sessionId: session.id,
      playerInput: input,
      baseline,
      overrides,
      conversationHistory: session.messages.map(
        (m): ConversationTurn => ({
          speaker: m.role === 'user' ? 'player' : 'character',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })
      ),
    });

    const dto: TurnResultDto = {
      message: turnResult.message,
      events: turnResult.events,
      stateChanges: turnResult.stateChanges,
      metadata: turnResult.metadata,
      success: turnResult.success,
    };

    return c.json(dto, 200);
  });
}
