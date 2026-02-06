import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';

const profileRouteMocks = vi.hoisted(() => ({
  listEntityProfilesMock: vi.fn(),
  getEntityProfileMock: vi.fn(),
  createEntityProfileMock: vi.fn(),
  updateEntityProfileMock: vi.fn(),
  deleteEntityProfileMock: vi.fn(),
  deleteCharacterFileMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  listEntityProfiles: profileRouteMocks.listEntityProfilesMock,
  getEntityProfile: profileRouteMocks.getEntityProfileMock,
  createEntityProfile: profileRouteMocks.createEntityProfileMock,
  updateEntityProfile: profileRouteMocks.updateEntityProfileMock,
  deleteEntityProfile: profileRouteMocks.deleteEntityProfileMock,
}));

vi.mock('../../../src/loaders/loader.js', () => ({
  deleteCharacterFile: profileRouteMocks.deleteCharacterFileMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: profileRouteMocks.getOwnerEmailMock,
}));

interface ProfileRoutesModule {
  registerProfileRoutes: (
    app: Hono,
    deps: { getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined }
  ) => void;
}

const { registerProfileRoutes } = (await import(
  '../../../src/routes/users/profiles.js'
)) as ProfileRoutesModule;

const ownerEmail = 'owner@example.com';
const characterId = '11111111-1111-1111-1111-111111111111';
const settingId = '22222222-2222-2222-2222-222222222222';

const characterProfile: CharacterProfile = {
  id: characterId,
  name: 'Aria',
  summary: 'A determined adventurer.',
  backstory: 'Grew up in the capital.',
  race: 'Human',
  personality: 'curious',
  tags: ['draft'],
  tier: 'minor',
};

const settingProfile: SettingProfile = {
  id: settingId,
  name: 'Stormreach',
  lore: 'A coastal city-state.',
};

/**
 * Build a Hono app with profile routes registered.
 */
function makeApp(getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined): Hono {
  const app = new Hono();
  registerProfileRoutes(app, { getLoaded });
  return app;
}

describe('routes/users/profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileRouteMocks.getOwnerEmailMock.mockReturnValue(ownerEmail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when data is not loaded', async () => {
    const app = makeApp(() => undefined);
    const res = await app.request('/characters');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'data not loaded' });
  });

  it('lists characters from filesystem and db', async () => {
    profileRouteMocks.listEntityProfilesMock.mockResolvedValue([
      { profileJson: characterProfile },
      { profileJson: { id: 'bad' } },
    ]);

    const app = makeApp(() => ({ characters: [characterProfile], settings: [settingProfile] }));
    const res = await app.request('/characters');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; source: string }[];
    expect(body).toEqual([
      {
        id: characterId,
        name: characterProfile.name,
        summary: characterProfile.summary,
        source: 'fs',
      },
      {
        id: characterId,
        name: characterProfile.name,
        summary: characterProfile.summary,
        source: 'db',
      },
    ]);
  });

  it('returns a filesystem character by id', async () => {
    const app = makeApp(() => ({ characters: [characterProfile], settings: [settingProfile] }));
    const res = await app.request(`/characters/${characterId}`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(characterProfile);
  });

  it('returns invalid db data when stored character is invalid', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'character',
      profileJson: { id: characterId },
    });

    const app = makeApp(() => ({ characters: [], settings: [settingProfile] }));
    const res = await app.request(`/characters/${characterId}`);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid db data' });
  });

  it('returns db character when valid', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'character',
      profileJson: characterProfile,
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/characters/${characterId}`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(characterProfile);
  });

  it('returns not found for missing character', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue(null);

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/characters/${characterId}`);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('creates a new character when none exists', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue(undefined);
    profileRouteMocks.createEntityProfileMock.mockResolvedValue(undefined);

    const app = makeApp(() => ({ characters: [], settings: [settingProfile] }));
    const res = await app.request('/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(characterProfile),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      character: {
        id: characterId,
        name: characterProfile.name,
        summary: characterProfile.summary,
        source: 'db',
      },
    });
  });

  it('prevents editing filesystem characters', async () => {
    const app = makeApp(() => ({ characters: [characterProfile], settings: [] }));
    const res = await app.request('/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(characterProfile),
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'cannot edit filesystem character',
    });
  });

  it('updates existing db character when authorized', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'character',
      ownerEmail,
      visibility: 'public',
    });
    profileRouteMocks.updateEntityProfileMock.mockResolvedValue(undefined);

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request('/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(characterProfile),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      character: {
        id: characterId,
        name: characterProfile.name,
        summary: characterProfile.summary,
        source: 'db',
      },
    });
  });

  it('rejects db character update when owner differs', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'character',
      ownerEmail: 'other@example.com',
      visibility: 'private',
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request('/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(characterProfile),
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'forbidden' });
  });

  it('deletes a filesystem character', async () => {
    profileRouteMocks.deleteCharacterFileMock.mockResolvedValue(true);

    const app = makeApp(() => ({ characters: [characterProfile], settings: [] }));
    const res = await app.request(`/characters/${characterId}`, { method: 'DELETE' });

    expect(res.status).toBe(204);
  });

  it('returns error when filesystem deletion fails', async () => {
    profileRouteMocks.deleteCharacterFileMock.mockResolvedValue(false);

    const app = makeApp(() => ({ characters: [characterProfile], settings: [] }));
    const res = await app.request(`/characters/${characterId}`, { method: 'DELETE' });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'failed to delete filesystem character',
    });
  });

  it('returns not found for non-uuid db delete', async () => {
    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request('/characters/not-a-uuid', { method: 'DELETE' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('denies db delete when owner differs', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'character',
      ownerEmail: 'other@example.com',
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/characters/${characterId}`, { method: 'DELETE' });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'forbidden' });
  });

  it('returns not found when db character is missing', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({ entityType: 'setting' });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/characters/${characterId}`, { method: 'DELETE' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('lists settings from filesystem and db', async () => {
    profileRouteMocks.listEntityProfilesMock.mockResolvedValue([
      { profileJson: settingProfile },
      { profileJson: { id: 'bad' } },
    ]);

    const app = makeApp(() => ({ characters: [], settings: [settingProfile] }));
    const res = await app.request('/settings');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; source: string }[];
    expect(body).toEqual([
      { id: settingId, name: settingProfile.name, source: 'fs' },
      { id: settingId, name: settingProfile.name, source: 'db' },
    ]);
  });

  it('returns setting from db when valid', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'setting',
      profileJson: settingProfile,
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/settings/${settingId}`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(settingProfile);
  });

  it('returns invalid db data for settings', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'setting',
      profileJson: { id: settingId },
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/settings/${settingId}`);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid db data' });
  });

  it('creates a new setting when none exists', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue(undefined);
    profileRouteMocks.createEntityProfileMock.mockResolvedValue(undefined);

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingProfile),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      setting: {
        id: settingId,
        name: settingProfile.name,
        source: 'db',
      },
    });
  });

  it('prevents editing filesystem settings', async () => {
    const app = makeApp(() => ({ characters: [], settings: [settingProfile] }));
    const res = await app.request('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingProfile),
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'cannot edit filesystem setting',
    });
  });

  it('updates existing setting when authorized', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'setting',
      ownerEmail,
      visibility: 'public',
    });
    profileRouteMocks.updateEntityProfileMock.mockResolvedValue(undefined);

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingProfile),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      setting: {
        id: settingId,
        name: settingProfile.name,
        source: 'db',
      },
    });
  });

  it('rejects setting update when owner differs', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'setting',
      ownerEmail: 'other@example.com',
      visibility: 'private',
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingProfile),
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'forbidden' });
  });

  it('deletes a setting when authorized', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'setting',
      ownerEmail,
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/settings/${settingId}`, { method: 'DELETE' });

    expect(res.status).toBe(204);
  });

  it('denies setting deletion when owner differs', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'setting',
      ownerEmail: 'other@example.com',
    });

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/settings/${settingId}`, { method: 'DELETE' });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'forbidden' });
  });

  it('returns not found when setting is missing', async () => {
    profileRouteMocks.getEntityProfileMock.mockResolvedValue(null);

    const app = makeApp(() => ({ characters: [], settings: [] }));
    const res = await app.request(`/settings/${settingId}`, { method: 'DELETE' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });
});
