import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const preferenceMocks = vi.hoisted(() => ({
  getUserPreferencesMock: vi.fn(),
  updateUserPreferencesMock: vi.fn(),
  getOrCreateDefaultUserMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getUserPreferences: preferenceMocks.getUserPreferencesMock,
  updateUserPreferences: preferenceMocks.updateUserPreferencesMock,
  getOrCreateDefaultUser: preferenceMocks.getOrCreateDefaultUserMock,
}));

interface PreferenceRoutesModule {
  registerUserPreferencesRoutes: (app: Hono) => void;
}

const { registerUserPreferencesRoutes } = (await import(
  '../../../src/routes/users/preferences.js'
)) as PreferenceRoutesModule;

/**
 * Build a Hono app with preferences routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerUserPreferencesRoutes(app);
  return app;
}

describe('routes/users/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns user preferences', async () => {
    preferenceMocks.getUserPreferencesMock.mockResolvedValue({ workspaceMode: 'compact' });

    const app = makeApp();
    const res = await app.request('/user/preferences');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      preferences: { workspaceMode: 'compact' },
    });
    expect(preferenceMocks.getOrCreateDefaultUserMock).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when preferences lookup fails', async () => {
    preferenceMocks.getUserPreferencesMock.mockRejectedValue(new Error('db error'));

    const app = makeApp();
    const res = await app.request('/user/preferences');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to get preferences' });
  });

  it('updates user preferences', async () => {
    preferenceMocks.updateUserPreferencesMock.mockResolvedValue({ workspaceMode: 'wizard' });

    const app = makeApp();
    const res = await app.request('/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceMode: 'wizard' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      preferences: { workspaceMode: 'wizard' },
    });
  });

  it('returns 500 when preference update fails', async () => {
    preferenceMocks.updateUserPreferencesMock.mockRejectedValue(new Error('db error'));

    const app = makeApp();
    const res = await app.request('/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceMode: 'wizard' }),
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to update preferences' });
  });

  it('returns workspace mode with default', async () => {
    preferenceMocks.getUserPreferencesMock.mockResolvedValue({});

    const app = makeApp();
    const res = await app.request('/user/preferences/workspace-mode');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, mode: 'wizard' });
  });

  it('returns 500 when workspace mode lookup fails', async () => {
    preferenceMocks.getUserPreferencesMock.mockRejectedValue(new Error('db error'));

    const app = makeApp();
    const res = await app.request('/user/preferences/workspace-mode');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'failed to get workspace mode',
    });
  });

  it('updates workspace mode', async () => {
    preferenceMocks.updateUserPreferencesMock.mockResolvedValue({ workspaceMode: 'compact' });

    const app = makeApp();
    const res = await app.request('/user/preferences/workspace-mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'compact' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, mode: 'compact' });
  });

  it('returns 500 when workspace mode update fails', async () => {
    preferenceMocks.updateUserPreferencesMock.mockRejectedValue(new Error('db error'));

    const app = makeApp();
    const res = await app.request('/user/preferences/workspace-mode', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'compact' }),
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: 'failed to set workspace mode',
    });
  });
});
