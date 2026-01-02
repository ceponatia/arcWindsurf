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
import { db } from '../../db/prismaClient.js';
import type { ApiError } from '../../types.js';
import {
  loadSensoryModifiers,
  type LoadedSensoryModifiers,
} from '../../loaders/sensory-modifiers-loader.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';

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
 * Get hygiene state for all body parts of an NPC.
 */
async function getNpcHygieneState(sessionId: string, npcId: string): Promise<NpcHygieneState> {
  const rows = await db.npcHygieneState.findMany({
    where: {
      sessionId,
      npcId,
    },
  });

  const bodyParts: Record<string, BodyPartHygieneState> = {};
  for (const row of rows) {
    bodyParts[row.bodyPart] = {
      points: row.points,
      level: row.level as HygieneLevel,
      lastUpdatedAt: row.lastUpdatedAt?.toISOString(),
    };
  }

  return {
    npcId,
    bodyParts,
  };
}

/**
 * Initialize hygiene state for an NPC (all body parts at level 0).
 */
async function initializeHygieneState(
  sessionId: string,
  npcId: string,
  ownerEmail: string
): Promise<NpcHygieneState> {
  const now = new Date();
  const bodyParts: Record<string, BodyPartHygieneState> = {};

  // Create records for all body regions
  for (const region of BODY_REGIONS) {
    await db.npcHygieneState.upsert({
      where: {
        sessionId_npcId_bodyPart: {
          sessionId,
          npcId,
          bodyPart: region,
        },
      },
      update: {},
      create: {
        sessionId,
        npcId,
        bodyPart: region,
        points: 0,
        level: 0,
        lastUpdatedAt: now,
        ownerEmail,
      },
    });

    bodyParts[region] = {
      points: 0,
      level: 0,
      lastUpdatedAt: now.toISOString(),
    };
  }

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
  input: HygieneUpdateInput,
  ownerEmail: string
): Promise<NpcHygieneState> {
  const modifiers = await getSensoryModifiers();
  const now = new Date();

  // Get current state or initialize
  let currentState = await getNpcHygieneState(sessionId, input.npcId);
  if (Object.keys(currentState.bodyParts).length === 0) {
    currentState = await initializeHygieneState(sessionId, input.npcId, ownerEmail);
  }

  // Handle cleaning action first
  if (input.cleanedParts && input.cleanedParts.length > 0) {
    for (const part of input.cleanedParts) {
      await db.npcHygieneState.update({
        where: {
          sessionId_npcId_bodyPart: {
            sessionId,
            npcId: input.npcId,
            bodyPart: part,
          },
        },
        data: {
          points: 0,
          level: 0,
          lastUpdatedAt: now,
        },
      });
      currentState.bodyParts[part] = {
        points: 0,
        level: 0,
        lastUpdatedAt: now.toISOString(),
      };
    }
  }

  // Apply decay to each body part
  for (const region of BODY_REGIONS) {
    // Skip if this part was just cleaned
    if (input.cleanedParts?.includes(region)) {
      continue;
    }

    const config = modifiers.decayRates[region];
    if (!config) {
      continue;
    }

    const currentPart = currentState.bodyParts[region] ?? { points: 0, level: 0 };
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

    // Update database
    await db.npcHygieneState.upsert({
      where: {
        sessionId_npcId_bodyPart: {
          sessionId,
          npcId: input.npcId,
          bodyPart: region,
        },
      },
      update: {
        points: newPoints,
        level: newLevel,
        lastUpdatedAt: now,
      },
      create: {
        sessionId,
        npcId: input.npcId,
        bodyPart: region,
        points: newPoints,
        level: newLevel,
        lastUpdatedAt: now,
        ownerEmail,
      },
    });

    currentState.bodyParts[region] = {
      points: newPoints,
      level: newLevel,
      lastUpdatedAt: now.toISOString(),
    };
  }

  return currentState;
}

/**
 * Apply a discrete hygiene event and persist changes.
 */
async function applyHygieneEventToNpc(
  sessionId: string,
  npcId: string,
  event: HygieneEvent,
  ownerEmail: string
): Promise<NpcHygieneState> {
  const modifiers = await getSensoryModifiers();
  const now = new Date();

  let currentState = await getNpcHygieneState(sessionId, npcId);
  if (Object.keys(currentState.bodyParts).length === 0) {
    currentState = await initializeHygieneState(sessionId, npcId, ownerEmail);
  }

  const nextState = applyHygieneEvent(currentState, event, modifiers.decayRates, now);

  for (const [bodyPart, nextPart] of Object.entries(nextState.bodyParts)) {
    const prev = currentState.bodyParts[bodyPart];
    if (prev && prev.points === nextPart.points && prev.level === nextPart.level) {
      continue;
    }

    await db.npcHygieneState.upsert({
      where: {
        sessionId_npcId_bodyPart: {
          sessionId,
          npcId,
          bodyPart,
        },
      },
      update: {
        points: nextPart.points,
        level: nextPart.level,
        lastUpdatedAt: now,
      },
      create: {
        sessionId,
        npcId,
        bodyPart,
        points: nextPart.points,
        level: nextPart.level,
        lastUpdatedAt: now,
        ownerEmail,
      },
    });
  }

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
    const ownerEmail = getOwnerEmail(c);

    try {
      const state = await initializeHygieneState(sessionId, npcId, ownerEmail);
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

    const ownerEmail = getOwnerEmail(c);

    try {
      const state = await updateHygieneState(sessionId, parsed.data, ownerEmail);
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
    const ownerEmail = getOwnerEmail(c);

    try {
      // Reset specified body parts
      for (const part of parsed.data.bodyParts) {
        await db.npcHygieneState.upsert({
          where: {
            sessionId_npcId_bodyPart: {
              sessionId,
              npcId,
              bodyPart: part,
            },
          },
          update: {
            points: 0,
            level: 0,
            lastUpdatedAt: now,
          },
          create: {
            sessionId,
            npcId,
            bodyPart: part,
            points: 0,
            level: 0,
            lastUpdatedAt: now,
            ownerEmail,
          },
        });
      }

      const state = await getNpcHygieneState(sessionId, npcId);
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

    const ownerEmail = getOwnerEmail(c);

    try {
      const state = await applyHygieneEventToNpc(
        sessionId,
        npcId,
        parsed.data as HygieneEvent,
        ownerEmail
      );
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

    try {
      const modifiers = await getSensoryModifiers();
      const state = await getNpcHygieneState(sessionId, npcId);
      const partState = state.bodyParts[bodyPart];
      const level = (partState?.level ?? 0) as HygieneLevel;

      const partModifiers = modifiers.bodyParts[bodyPart];
      const senseModifiers = partModifiers?.[senseType];
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
