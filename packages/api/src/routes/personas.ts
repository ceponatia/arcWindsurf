// src/routes/personas.ts
import type { Hono } from 'hono';
import { PersonaProfileSchema, type PersonaProfile } from '@minimal-rpg/schemas';
import { db } from '../db/prismaClient.js';
import { getSession } from '../db/sessionsClient.js';
import type { ApiError } from '../types.js';

interface PersonaSummary {
  id: string;
  name: string;
  summary: string;
  age: number | undefined;
  gender: string | undefined;
  createdAt: string;
  updatedAt: string;
}

function mapPersonaSummary(
  profile: PersonaProfile,
  createdAt: Date | string | null | undefined,
  updatedAt: Date | string | null | undefined
): PersonaSummary {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt ?? 0);
  const updated = updatedAt instanceof Date ? updatedAt : new Date(updatedAt ?? 0);
  return {
    id: profile.id,
    name: profile.name,
    summary: profile.summary,
    age: profile.age,
    gender: profile.gender,
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
  };
}

export function registerPersonaRoutes(app: Hono): void {
  // GET /personas - list all personas
  app.get('/personas', async (c) => {
    const userId = c.req.query('user_id'); // Optional user_id filter for multi-user support

    const personas = await db.persona.findMany(userId ? { where: { userId } } : undefined);

    const summaries: PersonaSummary[] = personas
      .map((p) => {
        try {
          const profile = PersonaProfileSchema.parse(JSON.parse(p.profileJson));
          return mapPersonaSummary(profile, p.createdAt, p.updatedAt);
        } catch {
          // Skip invalid rows
          return null;
        }
      })
      .filter((s): s is PersonaSummary => s !== null);

    return c.json(summaries, 200);
  });

  // GET /personas/:id - get full persona profile
  app.get('/personas/:id', async (c) => {
    const id = c.req.param('id');

    const persona = await db.persona.findUnique({
      where: { id },
    });

    if (!persona) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    try {
      const profile = PersonaProfileSchema.parse(JSON.parse(persona.profileJson));
      return c.json(profile, 200);
    } catch {
      return c.json({ ok: false, error: 'invalid persona data' } satisfies ApiError, 500);
    }
  });

  // POST /personas - create or update persona (upsert)
  app.post('/personas', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = PersonaProfileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    const profile = parsed.data;
    // user_id is optional - defaults to 'default' for single-user scenarios
    const userId = c.req.query('user_id') ?? 'default';

    // Check if persona with this ID already exists
    const existing = await db.persona.findUnique({
      where: { id: profile.id },
    });

    if (existing) {
      // Update existing persona instead of erroring
      const updated = await db.persona.update({
        where: { id: profile.id },
        data: {
          profileJson: JSON.stringify(profile),
        },
      });
      if (!updated) {
        return c.json(
          { ok: false, error: 'persona not found after update' } satisfies ApiError,
          404
        );
      }
      const summary = mapPersonaSummary(profile, updated.createdAt, updated.updatedAt);
      return c.json({ ok: true, persona: summary }, 200);
    }

    const created = await db.persona.create({
      data: {
        id: profile.id,
        userId,
        profileJson: JSON.stringify(profile),
      },
    });

    const summary = mapPersonaSummary(profile, created.createdAt, created.updatedAt);
    return c.json({ ok: true, persona: summary }, 201);
  });

  // PUT /personas/:id - update existing persona
  app.put('/personas/:id', async (c) => {
    const id = c.req.param('id');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = PersonaProfileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    const profile = parsed.data;

    // Ensure ID in URL matches ID in body
    if (profile.id !== id) {
      return c.json({ ok: false, error: 'id mismatch' } satisfies ApiError, 400);
    }

    const existing = await db.persona.findUnique({
      where: { id },
    });

    if (!existing) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    const updated = await db.persona.update({
      where: { id },
      data: {
        profileJson: JSON.stringify(profile),
      },
    });

    if (!updated) {
      return c.json({ ok: false, error: 'update failed' } satisfies ApiError, 500);
    }

    const summary = mapPersonaSummary(profile, updated.createdAt, updated.updatedAt);
    return c.json({ ok: true, persona: summary }, 200);
  });

  // DELETE /personas/:id - delete persona
  app.delete('/personas/:id', async (c) => {
    const id = c.req.param('id');

    const existing = await db.persona.findUnique({
      where: { id },
    });

    if (!existing) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    await db.persona.delete({ where: { id } });
    return c.body(null, 204);
  });

  // POST /sessions/:sessionId/persona - attach persona to session
  app.post('/sessions/:sessionId/persona', async (c) => {
    const sessionId = c.req.param('sessionId');

    let body: { personaId: string } | undefined;
    try {
      body = await c.req.json<{ personaId: string }>();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    if (!body?.personaId) {
      return c.json({ ok: false, error: 'personaId required' } satisfies ApiError, 400);
    }

    // Check if session exists
    const session = await getSession(sessionId);
    if (!session) {
      return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);
    }

    // Check if persona exists
    const persona = await db.persona.findUnique({
      where: { id: body.personaId },
    });

    if (!persona) {
      return c.json({ ok: false, error: 'persona not found' } satisfies ApiError, 404);
    }

    // Parse persona profile
    let profile: PersonaProfile;
    try {
      profile = PersonaProfileSchema.parse(JSON.parse(persona.profileJson));
    } catch {
      return c.json({ ok: false, error: 'invalid persona data' } satisfies ApiError, 500);
    }

    // Check if session already has a persona
    const existing = await db.sessionPersona.findUnique({
      where: { sessionId },
    });

    if (existing) {
      // Update existing
      await db.sessionPersona.update({
        where: { sessionId },
        data: {
          profileJson: JSON.stringify(profile),
          overridesJson: '{}',
        },
      });
    } else {
      // Create new
      await db.sessionPersona.create({
        data: {
          sessionId,
          personaId: body.personaId,
          profileJson: JSON.stringify(profile),
          overridesJson: '{}',
        },
      });
    }

    return c.json({ ok: true, persona: profile }, 200);
  });

  // GET /sessions/:sessionId/persona - get active session persona
  app.get('/sessions/:sessionId/persona', async (c) => {
    const sessionId = c.req.param('sessionId');

    const sessionPersona = await db.sessionPersona.findUnique({
      where: { sessionId },
    });

    if (!sessionPersona) {
      return c.json({ ok: false, error: 'no persona attached to session' } satisfies ApiError, 404);
    }

    try {
      const profile = PersonaProfileSchema.parse(JSON.parse(sessionPersona.profileJson));
      const overrides: Record<string, unknown> = sessionPersona.overridesJson
        ? (JSON.parse(sessionPersona.overridesJson) as Record<string, unknown>)
        : {};

      return c.json(
        {
          ok: true,
          persona: profile,
          overrides,
        },
        200
      );
    } catch {
      return c.json({ ok: false, error: 'invalid persona data' } satisfies ApiError, 500);
    }
  });

  // PUT /sessions/:sessionId/persona/overrides - update session persona overrides
  // @deprecated Use POST /sessions/:id/turns with tool-based state patches instead.
  // This endpoint bypasses the state manager turn lifecycle. Retained for debugging/admin use.
  app.put('/sessions/:sessionId/persona/overrides', async (c) => {
    console.warn('[DEPRECATED] PUT /sessions/:sessionId/persona/overrides bypasses state manager');
    const sessionId = c.req.param('sessionId');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const sessionPersona = await db.sessionPersona.findUnique({
      where: { sessionId },
    });

    if (!sessionPersona) {
      return c.json({ ok: false, error: 'no persona attached to session' } satisfies ApiError, 404);
    }

    // Validate that overrides is an object
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return c.json({ ok: false, error: 'overrides must be an object' } satisfies ApiError, 400);
    }

    const updated = await db.sessionPersona.update({
      where: { sessionId },
      data: {
        overridesJson: JSON.stringify(body),
      },
    });

    if (!updated?.overridesJson) {
      return c.json({ ok: false, error: 'Failed to update persona overrides' }, 500);
    }

    return c.json(
      { ok: true, overrides: JSON.parse(updated.overridesJson) as Record<string, unknown> },
      200
    );
  });

  // DELETE /sessions/:sessionId/persona - detach persona from session
  app.delete('/sessions/:sessionId/persona', async (c) => {
    const sessionId = c.req.param('sessionId');

    const existing = await db.sessionPersona.findUnique({
      where: { sessionId },
    });

    if (!existing) {
      return c.json({ ok: false, error: 'no persona attached to session' } satisfies ApiError, 404);
    }

    await db.sessionPersona.delete({ where: { sessionId } });
    return c.body(null, 204);
  });
}
