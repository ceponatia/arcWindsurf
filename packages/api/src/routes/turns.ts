import type { Hono } from 'hono';

import { getSession } from '../db/sessionsClient.js';
import type { ApiError, TurnResultDto } from '../types.js';
import { createGovernorForRequest } from '../governor/composition.js';
import type { TurnStateContext, ConversationTurn } from '@minimal-rpg/governor';
import { db } from '../db/prismaClient.js';
import { CharacterProfileSchema, SettingProfileSchema } from '@minimal-rpg/schemas';

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

export function registerTurnRoutes(app: Hono): void {
  // Minimal happy-path governor-backed turn endpoint.
  // POST /sessions/:id/turns { input: string }
  app.post('/sessions/:id/turns', async (c) => {
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
    // Load per-session instances from the database and derive baseline
    // from the stored template snapshots. This avoids any dependency on
    // filesystem-backed JSON data.
    const characterInstance = session.characterInstanceId
      ? await db.characterInstance.findUnique({ where: { id: session.characterInstanceId } })
      : await db.characterInstance.findUnique({ where: { sessionId: session.id } });

    const settingInstance = session.settingInstanceId
      ? await db.settingInstance.findUnique({ where: { id: session.settingInstanceId } })
      : await db.settingInstance.findUnique({ where: { sessionId: session.id } });

    if (!characterInstance || !settingInstance) {
      return c.json(
        {
          ok: false,
          error: 'character or setting instance not found for session',
        } satisfies ApiError,
        500
      );
    }

    let characterBaseline;
    let settingBaseline;

    try {
      characterBaseline = CharacterProfileSchema.parse(
        JSON.parse(characterInstance.templateSnapshot)
      );
      settingBaseline = SettingProfileSchema.parse(JSON.parse(settingInstance.templateSnapshot));
    } catch (err) {
      console.error('failed to parse character or setting snapshot', err);
      return c.json(
        { ok: false, error: 'failed to parse character or setting snapshot' } satisfies ApiError,
        500
      );
    }

    const baseline: TurnStateContext = {
      character: {
        name: characterBaseline.name,
        summary: characterBaseline.summary,
      },
      setting: {
        name: settingBaseline.name,
      },
      // Location and inventory slices will be filled in once the
      // schemas and instance data carry these fields consistently.
      location: {},
      inventory: {},
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
