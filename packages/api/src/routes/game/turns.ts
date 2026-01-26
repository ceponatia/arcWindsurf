import type { Hono } from 'hono';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import { getSession } from '../../db/sessionsClient.js';
import { getEntityProfile, listActorStatesForSession } from '@minimal-rpg/db/node';
import { notFound, serverError } from '../../utils/responses.js';
import { worldBus } from '@minimal-rpg/bus';
import { actorRegistry } from '@minimal-rpg/actors';
import {
  dialogueService,
  physicsService,
  timeService,
  socialEngine,
  rulesEngine,
} from '@minimal-rpg/services';
import type { CharacterProfile, WorldEvent } from '@minimal-rpg/schemas';
import { OpenAIProvider, createOpenRouterProviderFromEnv } from '@minimal-rpg/llm';
import { toSessionId } from '../../utils/uuid.js';

interface SessionRecord {
  id: string;
}

type SpokeEvent = Extract<WorldEvent, { type: 'SPOKE' }>;

interface TurnResponseDto {
  message: string;
  speaker?: { actorId: string; name?: string };
  events: WorldEvent[];
  success: boolean;
}

const RESPONSE_TIMEOUT_MS = 2500;

const defaultTurnLlmProvider =
  createOpenRouterProviderFromEnv({ id: 'session-turns' }) ??
  (process.env['OPENAI_API_KEY']
    ? new OpenAIProvider({
      id: 'session-turns-openai',
      apiKey: process.env['OPENAI_API_KEY'],
      model: process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini',
      ...(process.env['OPENAI_BASE_URL']
        ? { baseURL: process.env['OPENAI_BASE_URL'] }
        : {}),
    })
    : null);

/**
 * Guard for generic record objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parse a stored profile JSON blob into a CharacterProfile, if possible.
 */
function parseProfileJson(raw: unknown): CharacterProfile | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isRecord(parsed) ? (parsed as CharacterProfile) : null;
    } catch (error) {
      console.warn('[API] Failed to parse NPC profile JSON', error);
      return null;
    }
  }

  return isRecord(raw) ? (raw as CharacterProfile) : null;
}

/**
 * Resolve the NPC profile and display name from actor state + entity profile fallback.
 */
async function resolveNpcProfileAndName(
  actorState: Awaited<ReturnType<typeof listActorStatesForSession>>[number]
): Promise<{ profile: CharacterProfile | null; name: string | null }> {
  const rawState = actorState.state as Record<string, unknown>;
  const stateName = typeof rawState['name'] === 'string' ? rawState['name'] : null;
  const stateLabel = typeof rawState['label'] === 'string' ? rawState['label'] : null;

  const profileFromState = parseProfileJson(rawState['profileJson'] ?? rawState['profile']);
  const profileName = profileFromState?.name ?? null;

  if (profileFromState || actorState.entityProfileId) {
    const entityProfile = actorState.entityProfileId
      ? await getEntityProfile(actorState.entityProfileId)
      : null;
    const fallbackProfile = parseProfileJson(entityProfile?.profileJson);
    const fallbackName = entityProfile?.name ?? null;

    return {
      profile: profileFromState ?? fallbackProfile ?? (fallbackName ? ({ name: fallbackName } as CharacterProfile) : null),
      name: stateName ?? profileName ?? fallbackName ?? stateLabel ?? null,
    };
  }

  return {
    profile: profileFromState,
    name: stateName ?? profileName ?? stateLabel ?? null,
  };
}

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

    const session = (await getSession(sessionKey, ownerEmail)) as SessionRecord | null;
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

    // Spawn NPC actors for this session if missing.
    // NOTE: Projections only learn about NPCs via ACTOR_SPAWN events, so on a fresh
    // session we must seed actors from the authoritative actor_states table.
    const actorStates = await listActorStatesForSession(sessionKey);
    const npcDisplayNames = new Map<string, string>();
    for (const actorState of actorStates) {
      if (actorState.actorType !== 'npc') continue;
      const actorId = actorState.actorId;

      const rawState = actorState.state as Record<string, unknown>;
      const location = rawState['location'];
      const locationId =
        location && typeof location === 'object'
          ? (((location as Record<string, unknown>)['currentLocationId'] as string | undefined) ??
            'unknown')
          : 'unknown';

      const { profile, name } = await resolveNpcProfileAndName(actorState);

      if (name) {
        npcDisplayNames.set(actorId, name);
      }

      if (actorRegistry.has(actorId)) continue;

      actorRegistry.spawn({
        id: actorId,
        type: 'npc',
        npcId: actorId,
        sessionId: sessionKey,
        locationId,
        ...(profile ? { profile } : {}),
        ...(defaultTurnLlmProvider ? { llmProvider: defaultTurnLlmProvider } : {}),
      });
    }

    // Collect events emitted during this turn
    const collected: WorldEvent[] = [];
    const handler = (event: WorldEvent): void => {
      const eventSessionId = (event as { sessionId?: string }).sessionId;
      if (eventSessionId !== sessionKey) return;
      collected.push(event);
    };

    await worldBus.subscribe(handler);

    const playerActorId = `player:${ownerEmail}`;
    try {
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
    } finally {
      try {
        worldBus.unsubscribe(handler);
      } catch (error) {
        console.warn('[API] Failed to unsubscribe world bus handler', error);
      }
    }

    // Derive NPC response (first non-player SPOKE)
    const npcSpoke = collected.find(
      (evt): evt is SpokeEvent => evt.type === 'SPOKE' && evt.actorId !== playerActorId
    );

    const message = npcSpoke?.content ?? 'The world is quiet.';

    const response: TurnResponseDto = {
      message,
      events: collected,
      success: true,
      ...(npcSpoke
        ? {
          speaker: {
            actorId: npcSpoke.actorId,
            ...(npcDisplayNames.get(npcSpoke.actorId)
              ? { name: npcDisplayNames.get(npcSpoke.actorId) }
              : {}),
          },
        }
        : {}),
    };

    return c.json(response, 200);
  });
}
