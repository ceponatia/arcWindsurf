import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { PersonaProfile } from '@minimal-rpg/schemas';

const personaMocks = vi.hoisted(() => ({
  listEntityProfilesMock: vi.fn(),
  getEntityProfileMock: vi.fn(),
  createEntityProfileMock: vi.fn(),
  updateEntityProfileMock: vi.fn(),
  deleteEntityProfileMock: vi.fn(),
  upsertActorStateMock: vi.fn(),
  getActorStateMock: vi.fn(),
  deleteActorStateMock: vi.fn(),
  getSessionMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  listEntityProfiles: personaMocks.listEntityProfilesMock,
  getEntityProfile: personaMocks.getEntityProfileMock,
  createEntityProfile: personaMocks.createEntityProfileMock,
  updateEntityProfile: personaMocks.updateEntityProfileMock,
  deleteEntityProfile: personaMocks.deleteEntityProfileMock,
  upsertActorState: personaMocks.upsertActorStateMock,
  getActorState: personaMocks.getActorStateMock,
  deleteActorState: personaMocks.deleteActorStateMock,
}));

vi.mock('../../../src/db/sessionsClient.js', () => ({
  getSession: personaMocks.getSessionMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: personaMocks.getOwnerEmailMock,
}));

interface PersonaRoutesModule {
  registerPersonaRoutes: (app: Hono) => void;
}

const { registerPersonaRoutes } = (await import(
  '../../../src/routes/users/personas.js'
)) as PersonaRoutesModule;

const ownerEmail = 'owner@example.com';
const personaId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';

const createdAt = new Date('2026-02-05T12:00:00.000Z');
const updatedAt = new Date('2026-02-05T12:30:00.000Z');

const personaProfile: PersonaProfile = {
  id: personaId,
  name: 'Lyra',
  summary: 'A keen observer.',
  age: 28,
  gender: 'female',
};

const personaRow = {
  id: personaId,
  ownerEmail,
  entityType: 'persona',
  name: personaProfile.name,
  profileJson: personaProfile,
  createdAt,
  updatedAt,
};

/**
 * Build a Hono app with persona routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerPersonaRoutes(app);
  return app;
}

describe('routes/users/personas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    personaMocks.getOwnerEmailMock.mockReturnValue(ownerEmail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists persona summaries', async () => {
    personaMocks.listEntityProfilesMock.mockResolvedValue([personaRow, { profileJson: { id: 'bad' } }]);

    const app = makeApp();
    const res = await app.request('/personas');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string }[];
    expect(body[0]?.id).toBe(personaId);
    expect(body).toHaveLength(1);
  });

  it('returns persona profile by id', async () => {
    personaMocks.getEntityProfileMock.mockResolvedValue(personaRow);

    const app = makeApp();
    const res = await app.request(`/personas/${personaId}`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(personaProfile);
  });

  it('returns invalid persona data when parsing fails', async () => {
    personaMocks.getEntityProfileMock.mockResolvedValue({
      ...personaRow,
      profileJson: { id: personaId },
    });

    const app = makeApp();
    const res = await app.request(`/personas/${personaId}`);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid persona data' });
  });

  it('creates a new persona', async () => {
    personaMocks.getEntityProfileMock.mockResolvedValue(null);
    personaMocks.createEntityProfileMock.mockResolvedValue(personaRow);

    const app = makeApp();
    const res = await app.request('/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personaProfile),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; persona: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.persona.id).toBe(personaId);
  });

  it('rejects persona update when owner differs', async () => {
    personaMocks.getEntityProfileMock.mockResolvedValue({
      ...personaRow,
      ownerEmail: 'other@example.com',
    });

    const app = makeApp();
    const res = await app.request('/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personaProfile),
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not authorized' });
  });

  it('updates persona when authorized', async () => {
    personaMocks.getEntityProfileMock.mockResolvedValue(personaRow);
    personaMocks.updateEntityProfileMock.mockResolvedValue(personaRow);

    const app = makeApp();
    const res = await app.request(`/personas/${personaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personaProfile),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; persona: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.persona.id).toBe(personaId);
  });

  it('rejects persona update when id mismatches', async () => {
    const app = makeApp();
    const res = await app.request(`/personas/${personaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...personaProfile, id: sessionId }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'id mismatch' });
  });

  it('returns 404 when persona delete target missing', async () => {
    personaMocks.getEntityProfileMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/personas/${personaId}`, { method: 'DELETE' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('denies persona delete when owner differs', async () => {
    personaMocks.getEntityProfileMock.mockResolvedValue({
      ...personaRow,
      ownerEmail: 'other@example.com',
    });

    const app = makeApp();
    const res = await app.request(`/personas/${personaId}`, { method: 'DELETE' });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not authorized' });
  });

  it('attaches persona to session', async () => {
    personaMocks.getSessionMock.mockResolvedValue({ id: sessionId });
    personaMocks.getEntityProfileMock.mockResolvedValue(personaRow);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; persona: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.persona.id).toBe(personaId);
    expect(personaMocks.upsertActorStateMock).toHaveBeenCalled();
  });

  it('returns 404 when session for persona attach is missing', async () => {
    personaMocks.getSessionMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'session not found' });
  });

  it('returns 404 when persona is missing for attach', async () => {
    personaMocks.getSessionMock.mockResolvedValue({ id: sessionId });
    personaMocks.getEntityProfileMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'persona not found' });
  });

  it('returns invalid persona data when attach profile parsing fails', async () => {
    personaMocks.getSessionMock.mockResolvedValue({ id: sessionId });
    personaMocks.getEntityProfileMock.mockResolvedValue({
      ...personaRow,
      profileJson: { id: personaId },
    });

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid persona data' });
  });

  it('returns persona for session', async () => {
    personaMocks.getActorStateMock.mockResolvedValue({
      state: { profile: personaProfile },
    });

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; persona: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.persona.id).toBe(personaId);
  });

  it('returns invalid persona data for session', async () => {
    personaMocks.getActorStateMock.mockResolvedValue({ state: { profile: { id: personaId } } });

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid persona data' });
  });

  it('returns error when no persona is attached', async () => {
    personaMocks.getActorStateMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'no persona attached to session',
    });
  });

  it('detaches persona from session', async () => {
    personaMocks.getActorStateMock.mockResolvedValue({ state: { profile: personaProfile } });
    personaMocks.deleteActorStateMock.mockResolvedValue(undefined);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`, { method: 'DELETE' });

    expect(res.status).toBe(204);
    expect(personaMocks.deleteActorStateMock).toHaveBeenCalled();
  });

  it('returns error when no persona to detach', async () => {
    personaMocks.getActorStateMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/persona`, { method: 'DELETE' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'no persona attached to session',
    });
  });
});
