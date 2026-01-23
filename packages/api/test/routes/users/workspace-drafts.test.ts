import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { registerWorkspaceDraftRoutes } from '../../../src/routes/users/workspaceDrafts.js';

const dbMocks = vi.hoisted(() => ({
  listWorkspaceDrafts: vi.fn(),
  getWorkspaceDraft: vi.fn(),
  createWorkspaceDraft: vi.fn(),
  updateWorkspaceDraft: vi.fn(),
  deleteWorkspaceDraft: vi.fn(),
  pruneOldWorkspaceDrafts: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  ...dbMocks,
}));

/**
 * Build a minimal Hono app with workspace draft routes.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerWorkspaceDraftRoutes(app);
  return app;
}

describe('routes/users/workspace-drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists workspace drafts with defaults', async () => {
    dbMocks.listWorkspaceDrafts.mockResolvedValue([{ id: 'draft-1' }]);

    const app = makeApp();
    const res = await app.request('/workspace-drafts');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      drafts: [{ id: 'draft-1' }],
      total: 1,
    });

    expect(dbMocks.listWorkspaceDrafts).toHaveBeenCalledWith('default', { limit: 20 });
  });

  it('lists workspace drafts with query params', async () => {
    dbMocks.listWorkspaceDrafts.mockResolvedValue([{ id: 'draft-2' }, { id: 'draft-3' }]);

    const app = makeApp();
    const res = await app.request('/workspace-drafts?user_id=user-1&limit=5');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      drafts: [{ id: 'draft-2' }, { id: 'draft-3' }],
      total: 2,
    });

    expect(dbMocks.listWorkspaceDrafts).toHaveBeenCalledWith('user-1', { limit: 5 });
  });

  it('returns 500 when listing drafts fails', async () => {
    dbMocks.listWorkspaceDrafts.mockRejectedValue(new Error('boom'));

    const app = makeApp();
    const res = await app.request('/workspace-drafts');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to list drafts' });
  });

  it('gets a workspace draft by id', async () => {
    dbMocks.getWorkspaceDraft.mockResolvedValue({ id: 'draft-1', name: 'Draft' });

    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-1');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, draft: { id: 'draft-1', name: 'Draft' } });
    expect(dbMocks.getWorkspaceDraft).toHaveBeenCalledWith('draft-1');
  });

  it('returns 404 when draft is missing', async () => {
    dbMocks.getWorkspaceDraft.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-missing');

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('returns 500 when get draft fails', async () => {
    dbMocks.getWorkspaceDraft.mockRejectedValue(new Error('boom'));

    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-err');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to get draft' });
  });

  it('creates a draft with optional fields', async () => {
    dbMocks.createWorkspaceDraft.mockResolvedValue({ id: 'draft-1', name: 'Draft' });

    const app = makeApp();
    const res = await app.request('/workspace-drafts?user_id=user-1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Draft', workspaceState: { step: 'one' }, currentStep: 'map' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true, draft: { id: 'draft-1', name: 'Draft' } });
    expect(dbMocks.createWorkspaceDraft).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'Draft',
      workspaceState: { step: 'one' },
      currentStep: 'map',
    });
  });

  it('returns 400 when create body is invalid json', async () => {
    const app = makeApp();
    const res = await app.request('/workspace-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid json body' });
  });

  it('returns 400 when create body fails schema', async () => {
    const app = makeApp();
    const res = await app.request('/workspace-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStep: 123 }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: { fieldErrors: Record<string, unknown> } };
    expect(body.ok).toBe(false);
    expect(body.error.fieldErrors).toBeTruthy();
  });

  it('returns 500 when create fails', async () => {
    dbMocks.createWorkspaceDraft.mockRejectedValue(new Error('boom'));

    const app = makeApp();
    const res = await app.request('/workspace-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Draft' }),
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to create draft' });
  });

  it('updates a workspace draft', async () => {
    dbMocks.updateWorkspaceDraft.mockResolvedValue({ id: 'draft-1', name: 'Updated' });

    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated', validationState: { ok: true } }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, draft: { id: 'draft-1', name: 'Updated' } });
    expect(dbMocks.updateWorkspaceDraft).toHaveBeenCalledWith('draft-1', {
      name: 'Updated',
      validationState: { ok: true },
    });
  });

  it('returns 400 when update body is invalid json', async () => {
    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid json body' });
  });

  it('returns 400 when update body fails schema', async () => {
    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 123 }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: { fieldErrors: Record<string, unknown> } };
    expect(body.ok).toBe(false);
    expect(body.error.fieldErrors).toBeTruthy();
  });

  it('returns 404 when update target missing', async () => {
    dbMocks.updateWorkspaceDraft.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request('/workspace-drafts/missing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('returns 500 when update fails', async () => {
    dbMocks.updateWorkspaceDraft.mockRejectedValue(new Error('boom'));

    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to update draft' });
  });

  it('deletes a workspace draft', async () => {
    dbMocks.deleteWorkspaceDraft.mockResolvedValue(true);

    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-1', { method: 'DELETE' });

    expect(res.status).toBe(204);
    expect(dbMocks.deleteWorkspaceDraft).toHaveBeenCalledWith('draft-1');
  });

  it('returns 404 when delete target missing', async () => {
    dbMocks.deleteWorkspaceDraft.mockResolvedValue(false);

    const app = makeApp();
    const res = await app.request('/workspace-drafts/missing', { method: 'DELETE' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('returns 500 when delete fails', async () => {
    dbMocks.deleteWorkspaceDraft.mockRejectedValue(new Error('boom'));

    const app = makeApp();
    const res = await app.request('/workspace-drafts/draft-1', { method: 'DELETE' });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to delete draft' });
  });

  it('prunes old drafts', async () => {
    dbMocks.pruneOldWorkspaceDrafts.mockResolvedValue(3);

    const app = makeApp();
    const res = await app.request('/workspace-drafts/prune?days=7', { method: 'POST' });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, deleted: 3 });
    expect(dbMocks.pruneOldWorkspaceDrafts).toHaveBeenCalledWith(7);
  });

  it('returns 500 when prune fails', async () => {
    dbMocks.pruneOldWorkspaceDrafts.mockRejectedValue(new Error('boom'));

    const app = makeApp();
    const res = await app.request('/workspace-drafts/prune', { method: 'POST' });

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'failed to prune drafts' });
  });
});
