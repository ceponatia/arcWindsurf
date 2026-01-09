import type { Hono } from 'hono';
import { PersonaProfileSchema, type PersonaProfile } from '@minimal-rpg/schemas';
import {
  listEntityProfiles,
  getEntityProfile,
  createEntityProfile,
  updateEntityProfile,
  deleteEntityProfile,
  upsertActorState,
  getActorState,
  deleteActorState,
} from '@minimal-rpg/db/node';
import { getSession } from '../../db/sessionsClient.js';
import type { ApiError } from '../../types.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import { toId, toSessionId } from '../../utils/uuid.js';

interface PersonaActorState {
  profile?: PersonaProfile | Record<string, unknown>;
  status?: 'active' | 'inactive';
}

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
    const ownerEmail = getOwnerEmail(c);

    const personas = await listEntityProfiles(ownerEmail, 'persona');

    const summaries: PersonaSummary[] = personas
      .map((p) => {
        try {
          const profile = PersonaProfileSchema.parse(p.profileJson);
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

    const persona = await getEntityProfile(toId(id));

    if (persona?.entityType !== 'persona') {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    try {
      const profile = PersonaProfileSchema.parse(persona.profileJson);
      return c.json(profile, 200);
    } catch {
      return c.json({ ok: false, error: 'invalid persona data' } satisfies ApiError, 500);
    }
  });

  // POST /personas - create or update persona (upsert)
  app.post('/personas', async (c) => {
    const ownerEmail = getOwnerEmail(c);
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

    // Check if persona with this ID already exists
    const existing = await getEntityProfile(toId(profile.id));

    if (existing) {
      if (existing.ownerEmail !== ownerEmail && existing.ownerEmail !== 'public') {
        return c.json({ ok: false, error: 'not authorized' } satisfies ApiError, 403);
      }
      // Update existing persona
      const updated = await updateEntityProfile(toId(profile.id), {
        name: profile.name,
        profileJson: profile,
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

    const created = await createEntityProfile({
      id: toId(profile.id),
      ownerEmail,
      entityType: 'persona',
      name: profile.name,
      profileJson: profile,
    });

    const summary = mapPersonaSummary(profile, created.createdAt, created.updatedAt);
    return c.json({ ok: true, persona: summary }, 201);
  });

  // PUT /personas/:id - update existing persona
  app.put('/personas/:id', async (c) => {
    const id = c.req.param('id');
    const ownerEmail = getOwnerEmail(c);

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

    const existing = await getEntityProfile(toId(id));

    if (!existing) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    if (existing.ownerEmail !== ownerEmail && existing.ownerEmail !== 'public') {
      return c.json({ ok: false, error: 'not authorized' } satisfies ApiError, 403);
    }

    const updated = await updateEntityProfile(toId(id), {
      name: profile.name,
      profileJson: profile,
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
    const ownerEmail = getOwnerEmail(c);

    const existing = await getEntityProfile(toId(id));

    if (!existing) {
      return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
    }

    if (existing.ownerEmail !== ownerEmail) {
      return c.json({ ok: false, error: 'not authorized' } satisfies ApiError, 403);
    }

    await deleteEntityProfile(toId(id));
    return c.body(null, 204);
  });

  // POST /sessions/:sessionId/persona - attach persona to session
  app.post('/sessions/:sessionId/persona', async (c) => {
    const sessionId = c.req.param('sessionId');
    const ownerEmail = getOwnerEmail(c);

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
    const session = await getSession(sessionId, ownerEmail);
    if (!session) {
      return c.json({ ok: false, error: 'session not found' } satisfies ApiError, 404);
    }

    // Check if persona exists
    const persona = await getEntityProfile(toId(body.personaId));

    if (persona?.entityType !== 'persona') {
      return c.json({ ok: false, error: 'persona not found' } satisfies ApiError, 404);
    }

    // Parse persona profile
    let profile: PersonaProfile;
    try {
      profile = PersonaProfileSchema.parse(persona.profileJson);
    } catch {
      return c.json({ ok: false, error: 'invalid persona data' } satisfies ApiError, 500);
    }

    // Upsert actor state for player
    await upsertActorState({
      sessionId: toSessionId(sessionId),
      actorType: 'player',
      actorId: 'player',
      entityProfileId: toId(persona.id),
      state: {
        profile,
        status: 'active',
      },
      lastEventSeq: 0n, // Or get from session
    });

    return c.json({ ok: true, persona: profile }, 200);
  });

  // GET /sessions/:sessionId/persona - get active session persona
  app.get('/sessions/:sessionId/persona', async (c) => {
    const sessionId = c.req.param('sessionId');

    const playerState = await getActorState(toSessionId(sessionId), 'player');

    if (!playerState) {
      return c.json({ ok: false, error: 'no persona attached to session' } satisfies ApiError, 404);
    }

    try {
      const state = playerState.state as PersonaActorState;
      const profile = PersonaProfileSchema.parse(state.profile || state);

      return c.json(
        {
          ok: true,
          persona: profile,
          overrides: {}, // We no longer support legacy overrides here
        },
        200
      );
    } catch {
      return c.json({ ok: false, error: 'invalid persona data' } satisfies ApiError, 500);
    }
  });

  // DELETE /sessions/:sessionId/persona - detach persona from session
  app.delete('/sessions/:sessionId/persona', async (c) => {
    const sessionId = c.req.param('sessionId');

    const existing = await getActorState(toSessionId(sessionId), 'player');

    if (!existing) {
      return c.json({ ok: false, error: 'no persona attached to session' } satisfies ApiError, 404);
    }

    await deleteActorState(toSessionId(sessionId), 'player');
    return c.body(null, 204);
  });
}
