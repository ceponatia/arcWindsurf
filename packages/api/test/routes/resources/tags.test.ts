import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const tagRouteMocks = vi.hoisted(() => ({
  listPromptTagsMock: vi.fn(),
  getPromptTagMock: vi.fn(),
  createPromptTagMock: vi.fn(),
  updatePromptTagMock: vi.fn(),
  deletePromptTagMock: vi.fn(),
  createSessionTagBindingMock: vi.fn(),
  getSessionTagsWithDefinitionsMock: vi.fn(),
  toggleSessionTagBindingMock: vi.fn(),
  deleteSessionTagBindingMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

vi.mock('../../../src/db/sessionsClient.js', () => ({
  listPromptTags: tagRouteMocks.listPromptTagsMock,
  getPromptTag: tagRouteMocks.getPromptTagMock,
  createPromptTag: tagRouteMocks.createPromptTagMock,
  updatePromptTag: tagRouteMocks.updatePromptTagMock,
  deletePromptTag: tagRouteMocks.deletePromptTagMock,
  createSessionTagBinding: tagRouteMocks.createSessionTagBindingMock,
  getSessionTagsWithDefinitions: tagRouteMocks.getSessionTagsWithDefinitionsMock,
  toggleSessionTagBinding: tagRouteMocks.toggleSessionTagBindingMock,
  deleteSessionTagBinding: tagRouteMocks.deleteSessionTagBindingMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: tagRouteMocks.getOwnerEmailMock,
}));

interface TagRoutesModule {
  registerTagRoutes: (app: Hono) => void;
}

const { registerTagRoutes } = (await import(
  '../../../src/routes/resources/tags.js'
)) as TagRoutesModule;

const ownerEmail = 'owner@example.com';
const tagId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const bindingId = '33333333-3333-4333-8333-333333333333';

const createdAt = new Date('2026-02-04T10:00:00.000Z');
const updatedAt = new Date('2026-02-04T10:30:00.000Z');

const tagRow = {
  id: tagId,
  name: 'Cozy',
  category: null,
  promptText: 'Add cozy details.',
  description: null,
  isActive: true,
  createdAt,
  updatedAt,
};

const bindingRow = {
  id: bindingId,
  sessionId,
  tagId,
  enabled: true,
  createdAt,
  tag: tagRow,
};

/**
 * Build a Hono app with tag routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerTagRoutes(app);
  return app;
}

describe('routes/resources/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tagRouteMocks.getOwnerEmailMock.mockReturnValue(ownerEmail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists tags with filters', async () => {
    tagRouteMocks.listPromptTagsMock.mockResolvedValue([tagRow]);

    const app = makeApp();
    const res = await app.request('/tags?category=style&isBuiltIn=true');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      tags: [
        {
          id: tagId,
          owner: 'admin',
          visibility: 'public',
          name: tagRow.name,
          shortDescription: undefined,
          category: 'style',
          promptText: tagRow.promptText,
          activationMode: 'always',
          targetType: 'session',
          triggers: [],
          priority: 'normal',
          compositionMode: 'append',
          version: '1.0.0',
          isBuiltIn: true,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ],
      total: 1,
    });
    expect(tagRouteMocks.listPromptTagsMock).toHaveBeenCalledWith({
      category: 'style',
      isBuiltIn: true,
    });
  });

  it('returns 404 when tag is missing', async () => {
    tagRouteMocks.getPromptTagMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/tags/${tagId}`);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Tag not found' });
  });

  it('creates a tag', async () => {
    tagRouteMocks.createPromptTagMock.mockResolvedValue(tagRow);

    const app = makeApp();
    const res = await app.request('/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tagRow.name, promptText: tagRow.promptText }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(tagId);
  });

  it('updates a tag', async () => {
    tagRouteMocks.updatePromptTagMock.mockResolvedValue(tagRow);

    const app = makeApp();
    const res = await app.request(`/tags/${tagId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptText: 'Updated text' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(tagId);
  });

  it('returns 404 when update target is missing', async () => {
    tagRouteMocks.updatePromptTagMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/tags/${tagId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptText: 'Updated text' }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Tag not found' });
  });

  it('deletes a tag', async () => {
    tagRouteMocks.deletePromptTagMock.mockResolvedValue(true);

    const app = makeApp();
    const res = await app.request(`/tags/${tagId}`, { method: 'DELETE' });

    expect(res.status).toBe(204);
  });

  it('returns bindings for a session', async () => {
    tagRouteMocks.getSessionTagsWithDefinitionsMock.mockResolvedValue([bindingRow]);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/tags`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { bindings: { id: string }[] };
    expect(body.bindings[0]?.id).toBe(bindingId);
  });

  it('creates a session tag binding', async () => {
    tagRouteMocks.createSessionTagBindingMock.mockResolvedValue(bindingRow);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId, enabled: true }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(bindingId);
  });

  it('toggles a session tag binding', async () => {
    tagRouteMocks.toggleSessionTagBindingMock.mockResolvedValue(bindingRow);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/tags/${bindingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; enabled: boolean };
    expect(body.id).toBe(bindingId);
    expect(body.enabled).toBe(true);
  });

  it('returns 404 when binding is missing', async () => {
    tagRouteMocks.toggleSessionTagBindingMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/tags/${bindingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Binding not found' });
  });

  it('deletes a session tag binding', async () => {
    tagRouteMocks.deleteSessionTagBindingMock.mockResolvedValue(true);

    const app = makeApp();
    const res = await app.request(`/sessions/${sessionId}/tags/${bindingId}`, {
      method: 'DELETE'
    });

    expect(res.status).toBe(204);
  });
});
