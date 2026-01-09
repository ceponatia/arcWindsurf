/**
 * API routes for NPC hygiene state management.
 *
 * These endpoints allow reading and updating hygiene state for NPCs in a session.
 * Hygiene state is used by the sensory system to generate context-aware descriptions.
 */
import type { Hono } from 'hono';
import { z } from 'zod';
import {
  HygieneUpdateInputSchema,
  BODY_REGIONS,
  applyHygieneEvent,
  calculateHygieneLevel,
  calculateDecayPoints,
  isFootRelatedPart,
  getSensoryModifierByLevel,
  type HygieneEvent,
  type NpcHygieneState,
  type BodyPartHygieneState,
  type HygieneUpdateInput,
  type HygieneLevel,
} from '@minimal-rpg/schemas';
import { getActorState, upsertActorState } from '@minimal-rpg/db/node';
import type { ApiError } from '../../types.js';
import {
  loadSensoryModifiers,
  type LoadedSensoryModifiers,
} from '../../loaders/sensory-modifiers-loader.js';
import { toSessionId, toId } from '../../utils/uuid.js';

interface HygieneActorState {
  hygiene?: Record<string, BodyPartHygieneState>;
  [key: string]: unknown;
}

type BodyRegionKey = (typeof BODY_REGIONS)[number];
const BODY_REGION_LIST = BODY_REGIONS as readonly BodyRegionKey[];

function isBodyRegion(part: string): part is BodyRegionKey {
  return (BODY_REGION_LIST as readonly string[]).includes(part);
}

function initializeBodyParts(timestamp: string): Record<BodyRegionKey, BodyPartHygieneState> {
  return Object.fromEntries(
    BODY_REGION_LIST.map((region) => [
      region,
      {
        points: 0,
        level: 0,
        lastUpdatedAt: timestamp,
      },
    ])
  ) as Record<BodyRegionKey, BodyPartHygieneState>;
}

function setBodyPartState(
  bodyParts: Record<string, BodyPartHygieneState>,
  part: BodyRegionKey,
  state: BodyPartHygieneState
): Record<string, BodyPartHygieneState> {
  return { ...bodyParts, [part]: state };
}

function getBodyPartState(
  bodyParts: Record<string, BodyPartHygieneState>,
  part: BodyRegionKey
): BodyPartHygieneState | undefined {
  // eslint-disable-next-line security/detect-object-injection -- part is validated against BODY_REGIONS
  return bodyParts[part];
}

function sanitizeBodyParts(
  bodyParts: Record<string, BodyPartHygieneState>,
  timestamp: string
): Record<BodyRegionKey, BodyPartHygieneState> {
  return Object.fromEntries(
    BODY_REGION_LIST.map((region) => [
      region,
      // eslint-disable-next-line security/detect-object-injection -- region comes from BODY_REGIONS constant
      bodyParts[region] ?? {
        points: 0,
        level: 0,
        lastUpdatedAt: timestamp,
      },
    ])
  ) as Record<BodyRegionKey, BodyPartHygieneState>;
}

// Cache for sensory modifiers
let sensoryModifiersCache: LoadedSensoryModifiers | null = null;

/**
 * Get sensory modifiers (cached).
 */
async function getSensoryModifiers(): Promise<LoadedSensoryModifiers> {
  sensoryModifiersCache ??= await loadSensoryModifiers();
  return sensoryModifiersCache;
}

/**
 * Get hygiene state for all body parts of an NPC from actor_states.
 */
async function getNpcHygieneState(sessionId: string, npcId: string): Promise<NpcHygieneState> {
  const actorState = await getActorState(toSessionId(sessionId), npcId);

  if (!actorState?.state) {
    return { npcId, bodyParts: {} };
  }

  const state = actorState.state as HygieneActorState;
  const hygiene = state.hygiene ?? {};

  return {
    npcId,
    bodyParts: hygiene,
  };
}

/**
 * Save hygiene state to actor_states.
 */
async function saveNpcHygieneState(
  sessionId: string,
  npcId: string,
  hygiene: Record<string, BodyPartHygieneState>
): Promise<void> {
  const actorState = await getActorState(toSessionId(sessionId), npcId);

  if (!actorState) {
    throw new Error(`Actor state not found for NPC ${npcId} in session ${sessionId}`);
  }

  const newState = {
    ...(actorState.state as object),
    hygiene,
  };

  await upsertActorState({
    sessionId: toSessionId(sessionId),
    actorType: actorState.actorType,
    actorId: npcId,
    entityProfileId: actorState.entityProfileId ? toId(actorState.entityProfileId) : null,
    state: newState,
    lastEventSeq: actorState.lastEventSeq,
  });
}

/**
 * Initialize hygiene state for an NPC (all body parts at level 0).
 */
async function initializeHygieneState(
  sessionId: string,
  npcId: string
): Promise<NpcHygieneState> {
  const now = new Date();
  const bodyParts = initializeBodyParts(now.toISOString());

  await saveNpcHygieneState(sessionId, npcId, bodyParts);

  return {
    npcId,
    bodyParts,
  };
}

/**
 * Update hygiene state based on activity, footwear, and environment.
 */
async function updateHygieneState(
  sessionId: string,
  input: HygieneUpdateInput
): Promise<NpcHygieneState> {
  const modifiers = await getSensoryModifiers();
  const now = new Date();

  // Get current state or initialize
  let currentState = await getNpcHygieneState(sessionId, input.npcId);
  if (Object.keys(currentState.bodyParts).length === 0) {
    currentState = await initializeHygieneState(sessionId, input.npcId);
  }

  const normalizedBodyParts = sanitizeBodyParts(currentState.bodyParts, now.toISOString());
  currentState = { ...currentState, bodyParts: normalizedBodyParts };

  // Handle cleaning action first
  if (input.cleanedParts && input.cleanedParts.length > 0) {
    for (const part of input.cleanedParts) {
      if (!isBodyRegion(part)) {
        continue;
      }
      currentState.bodyParts = setBodyPartState(currentState.bodyParts, part, {
        points: 0,
        level: 0,
        lastUpdatedAt: now.toISOString(),
      });
    }
  }

  // Apply decay to each body part
  for (const region of BODY_REGIONS) {
    // Skip if this part was just cleaned
    if (input.cleanedParts?.includes(region)) {
      continue;
    }

    // eslint-disable-next-line security/detect-object-injection -- region comes from BODY_REGIONS constant
    const config = modifiers.decayRates[region];
    if (!config) {
      continue;
    }

    const currentPart =
      getBodyPartState(currentState.bodyParts, region) ??
      ({ points: 0, level: 0, lastUpdatedAt: now.toISOString() } satisfies BodyPartHygieneState);
    const currentLevel = (currentPart.level ?? 0) as HygieneLevel;

    // Calculate new decay points
    const decayPoints = calculateDecayPoints(
      config.baseDecayPerTurn,
      input.turnsElapsed,
      input.activity,
      input.footwear,
      input.environment,
      isFootRelatedPart(region),
      currentLevel
    );

    const newPoints = currentPart.points + decayPoints;
    const newLevel = calculateHygieneLevel(newPoints, config.thresholds);

    currentState.bodyParts = setBodyPartState(currentState.bodyParts, region, {
      points: newPoints,
      level: newLevel,
      lastUpdatedAt: now.toISOString(),
    });
  }

  await saveNpcHygieneState(sessionId, input.npcId, currentState.bodyParts);
  return currentState;
}

/**
 * Apply a discrete hygiene event and persist changes.
 */
async function applyHygieneEventToNpc(
  sessionId: string,
  npcId: string,
  event: HygieneEvent
): Promise<NpcHygieneState> {
  const modifiers = await getSensoryModifiers();
  const now = new Date();

  let currentState = await getNpcHygieneState(sessionId, npcId);
  if (Object.keys(currentState.bodyParts).length === 0) {
    currentState = await initializeHygieneState(sessionId, npcId);
  }

  const nextState = applyHygieneEvent(currentState, event, modifiers.decayRates, now);
  await saveNpcHygieneState(sessionId, npcId, nextState.bodyParts);

  return nextState;
}

/**
 * Register hygiene-related routes.
 */
export function registerHygieneRoutes(app: Hono): void {
  // GET /sessions/:sessionId/npcs/:npcId/hygiene - Get NPC hygiene state
  app.get('/sessions/:sessionId/npcs/:npcId/hygiene', async (c) => {
    const sessionId = c.req.param('sessionId');
    const npcId = c.req.param('npcId');

    try {
      const state = await getNpcHygieneState(sessionId, npcId);
      return c.json(state, 200);
    } catch (error) {
      console.error('Error fetching hygiene state:', error);
      return c.json({ ok: false, error: 'Failed to fetch hygiene state' } satisfies ApiError, 500);
    }
  });

  // POST /sessions/:sessionId/npcs/:npcId/hygiene/initialize - Initialize hygiene state
  app.post('/sessions/:sessionId/npcs/:npcId/hygiene/initialize', async (c) => {
    const sessionId = c.req.param('sessionId');
    const npcId = c.req.param('npcId');

    try {
      const state = await initializeHygieneState(sessionId, npcId);
      return c.json(state, 201);
    } catch (error) {
      console.error('Error initializing hygiene state:', error);
      return c.json(
        { ok: false, error: 'Failed to initialize hygiene state' } satisfies ApiError,
        500
      );
    }
  });

  // POST /sessions/:sessionId/npcs/:npcId/hygiene/update - Update hygiene based on activity
  app.post('/sessions/:sessionId/npcs/:npcId/hygiene/update', async (c) => {
    const sessionId = c.req.param('sessionId');
    const npcId = c.req.param('npcId');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'Invalid JSON body' } satisfies ApiError, 400);
    }

    // Parse and validate input
    const inputWithNpc = { ...(body as object), npcId };
    const parsed = HygieneUpdateInputSchema.safeParse(inputWithNpc);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    try {
      const state = await updateHygieneState(sessionId, parsed.data);
      return c.json(state, 200);
    } catch (error) {
      console.error('Error updating hygiene state:', error);
      return c.json({ ok: false, error: 'Failed to update hygiene state' } satisfies ApiError, 500);
    }
  });

  // POST /sessions/:sessionId/npcs/:npcId/hygiene/clean - Clean specific body parts
  app.post('/sessions/:sessionId/npcs/:npcId/hygiene/clean', async (c) => {
    const sessionId = c.req.param('sessionId');
    const npcId = c.req.param('npcId');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'Invalid JSON body' } satisfies ApiError, 400);
    }

    const cleanSchema = z.object({
      bodyParts: z.array(z.string()).min(1),
    });

    const parsed = cleanSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    const now = new Date();
    try {
      const state = await getNpcHygieneState(sessionId, npcId);

      // Reset specified body parts
      for (const part of parsed.data.bodyParts) {
        if ((BODY_REGIONS as readonly string[]).includes(part)) {
          // eslint-disable-next-line security/detect-object-injection -- part validated against BODY_REGIONS
          state.bodyParts[part] = {
            points: 0,
            level: 0,
            lastUpdatedAt: now.toISOString(),
          };
        }
      }

      await saveNpcHygieneState(sessionId, npcId, state.bodyParts);
      return c.json(state, 200);
    } catch (error) {
      console.error('Error cleaning body parts:', error);
      return c.json({ ok: false, error: 'Failed to clean body parts' } satisfies ApiError, 500);
    }
  });

  // POST /sessions/:sessionId/npcs/:npcId/hygiene/event - Apply a discrete hygiene event
  app.post('/sessions/:sessionId/npcs/:npcId/hygiene/event', async (c) => {
    const sessionId = c.req.param('sessionId');
    const npcId = c.req.param('npcId');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'Invalid JSON body' } satisfies ApiError, 400);
    }

    const hygieneEventSchema = z.union([
      z.object({ kind: z.literal('clean'), event: z.string() }),
      z.object({
        kind: z.literal('dirty'),
        event: z.string(),
        bodyParts: z.array(z.string()).optional(),
      }),
    ]);

    const parsed = hygieneEventSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    try {
      const state = await applyHygieneEventToNpc(sessionId, npcId, parsed.data as HygieneEvent);
      return c.json(state, 200);
    } catch (error) {
      console.error('Error applying hygiene event:', error);
      return c.json({ ok: false, error: 'Failed to apply hygiene event' } satisfies ApiError, 500);
    }
  });

  // GET /sessions/:sessionId/npcs/:npcId/hygiene/sensory/:bodyPart/:senseType - Get sensory modifier
  app.get('/sessions/:sessionId/npcs/:npcId/hygiene/sensory/:bodyPart/:senseType', async (c) => {
    const sessionId = c.req.param('sessionId');
    const npcId = c.req.param('npcId');
    const bodyPart = c.req.param('bodyPart');
    const senseType = c.req.param('senseType') as 'smell' | 'touch' | 'taste';

    if (!['smell', 'touch', 'taste'].includes(senseType)) {
      return c.json({ ok: false, error: 'Invalid sense type' } satisfies ApiError, 400);
    }

    if (!isBodyRegion(bodyPart)) {
      return c.json({ ok: false, error: 'Invalid body part' } satisfies ApiError, 400);
    }

    try {
      const modifiers = await getSensoryModifiers();
      const state = await getNpcHygieneState(sessionId, npcId);
      const partState = getBodyPartState(state.bodyParts, bodyPart);
      const level = (partState?.level ?? 0) as HygieneLevel;

      const partModifiers = Object.prototype.hasOwnProperty.call(modifiers.bodyParts, bodyPart)
        ? // eslint-disable-next-line security/detect-object-injection -- bodyPart validated by isBodyRegion
        modifiers.bodyParts[bodyPart]
        : undefined;
      const senseModifiers = partModifiers
        ? // eslint-disable-next-line security/detect-object-injection -- senseType constrained to allowed senses
        partModifiers[senseType]
        : undefined;
      const modifier = senseModifiers ? getSensoryModifierByLevel(senseModifiers, level) : '';

      return c.json(
        {
          bodyPart,
          senseType,
          level,
          modifier,
        },
        200
      );
    } catch (error) {
      console.error('Error fetching sensory modifier:', error);
      return c.json(
        { ok: false, error: 'Failed to fetch sensory modifier' } satisfies ApiError,
        500
      );
    }
  });
}
