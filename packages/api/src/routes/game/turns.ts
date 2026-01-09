import type { Hono } from 'hono';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import { getSession } from '../../db/sessionsClient.js';
import { notFound, serverError } from '../../utils/responses.js';
import { worldProjectionService } from '../../services/projection-service.js';
import { worldBus } from '@minimal-rpg/bus';
import { actorRegistry } from '@minimal-rpg/actors';
import {
  dialogueService,
  physicsService,
  timeService,
  socialEngine,
  rulesEngine,
} from '@minimal-rpg/services';
import type { WorldEvent } from '@minimal-rpg/schemas';
import { toSessionId } from '../../utils/uuid.js';

type SpokeEvent = Extract<WorldEvent, { type: 'SPOKE' }>;

interface TurnResponseDto {
  message: string;
  speaker?: { actorId: string };
  events: WorldEvent[];
  success: boolean;
}

const RESPONSE_TIMEOUT_MS = 400;

export function registerTurnRoutes(app: Hono): void {
  /**
   * POST /sessions/:id/turns
   *
   * Execute a turn using the World Bus + Actors pipeline.
   */
  app.post('/sessions/:id/turns', async (c) => {
    const sessionId = c.req.param('id');
    const sessionKey = toSessionId(sessionId);
    const ownerEmail = getOwnerEmail(c);

    const session = await getSession(sessionKey, ownerEmail);
    if (!session) {
      return notFound(c, 'session not found');
    }

    const body: unknown = await c.req.json().catch(() => null);
    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as { input?: unknown }).input !== 'string'
    ) {
      return serverError(c, 'input is required');
    }

    const input = (body as { input: string }).input.trim();
    const requestedNpcId =
      typeof (body as { npcId?: unknown }).npcId === 'string'
        ? (body as { npcId: string }).npcId.trim()
        : '';
    const targetNpcId = requestedNpcId.length > 0 ? requestedNpcId : null;

    // Ensure core services are running (idempotent starts)
    dialogueService.start();
    physicsService.start();
    timeService.start();
    socialEngine.start();
    rulesEngine.start();

    // Hydrate projections to discover active NPCs and locations
    const projectionManager = await worldProjectionService.getManager(sessionKey);
    const npcProjection = projectionManager.npcs.getState();

    // Spawn NPC actors for this session if missing
    for (const [npcId, npcState] of Object.entries(npcProjection)) {
      const actorId = npcId;
      if (actorRegistry.has(actorId)) continue;

      actorRegistry.spawn({
        id: actorId,
        type: 'npc',
        npcId,
        sessionId: sessionKey,
        locationId: npcState.location.locationId ?? 'unknown',
      });
    }

    // Collect events emitted during this turn
    const collected: WorldEvent[] = [];
    const handler = (event: WorldEvent): void => {
      if ((event as Record<string, unknown>)['sessionId'] !== sessionKey) return;
      collected.push(event);
    };

    await worldBus.subscribe(handler);

    const playerActorId = `player:${ownerEmail}`;
    const playerSpoke: WorldEvent = {
      type: 'SPOKE',
      actorId: playerActorId,
      content: input,
      targetActorId: targetNpcId ?? undefined,
      sessionId: sessionKey,
      timestamp: new Date(),
    };

    await worldBus.emit(playerSpoke);

    // Wait briefly for NPC responses to propagate
    await new Promise((resolve) => setTimeout(resolve, RESPONSE_TIMEOUT_MS));

    worldBus.unsubscribe(handler);

    // Derive NPC response (first non-player SPOKE)
    const npcSpoke = collected.find(
      (evt): evt is SpokeEvent => evt.type === 'SPOKE' && evt.actorId !== playerActorId
    );

    const message = npcSpoke?.content ?? 'The world is quiet.';

    const npcSpeaker = npcSpoke
      ? {
        id: npcSpoke.actorId,
        name: npcSpoke.actorId,
      }
      : undefined;

    const response: TurnResponseDto = {
      message,
      events: collected,
      success: true,
      ...(npcSpoke ? { speaker: { actorId: npcSpoke.actorId } } : {}),
    };

    return c.json(response, 200);
  });
}
