import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const itemRouteMocks = vi.hoisted(() => ({
  listEntityProfilesMock: vi.fn(),
  getEntityProfileMock: vi.fn(),
  createEntityProfileMock: vi.fn(),
  updateEntityProfileMock: vi.fn(),
  deleteEntityProfileMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

vi.mock('../../../src/db/sessionsClient.js', () => ({
  listEntityProfiles: itemRouteMocks.listEntityProfilesMock,
  getEntityProfile: itemRouteMocks.getEntityProfileMock,
  createEntityProfile: itemRouteMocks.createEntityProfileMock,
  updateEntityProfile: itemRouteMocks.updateEntityProfileMock,
  deleteEntityProfile: itemRouteMocks.deleteEntityProfileMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: itemRouteMocks.getOwnerEmailMock,
}));

interface ItemRoutesModule {
  registerItemRoutes: (app: Hono) => void;
}

const { registerItemRoutes } = (await import(
  '../../../src/routes/resources/items.js'
)) as ItemRoutesModule;

const ownerEmail = 'owner@example.com';
const itemId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';

const genericItem = {
  id: itemId,
  name: 'Sprocket',
  type: 'tool',
  description: 'A small metal sprocket.',
  category: 'generic',
  properties: {},
};

const weaponItem = {
  id: otherId,
  name: 'Dagger',
  type: 'weapon',
  description: 'A short blade.',
  category: 'weapon',
  properties: {},
};

/**
 * Build a Hono app with item routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerItemRoutes(app);
  return app;
}

describe('routes/resources/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemRouteMocks.getOwnerEmailMock.mockReturnValue(ownerEmail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists item summaries and filters by category', async () => {
    itemRouteMocks.listEntityProfilesMock.mockResolvedValue([
      { profileJson: genericItem },
      { profileJson: weaponItem },
      { profileJson: { id: 'bad' } },
    ]);

    const app = makeApp();
    const res = await app.request('/items?category=weapon');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      {
        id: weaponItem.id,
        name: weaponItem.name,
        category: weaponItem.category,
        type: weaponItem.type,
        description: weaponItem.description,
      },
    ]);
    expect(itemRouteMocks.listEntityProfilesMock).toHaveBeenCalledWith({
      entityType: 'item',
      ownerEmail,
      visibility: 'public',
    });
  });

  it('returns item definition when authorized', async () => {
    itemRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'item',
      ownerEmail,
      profileJson: genericItem,
    });

    const app = makeApp();
    const res = await app.request(`/items/${itemId}`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(genericItem);
  });

  it('returns 404 when item owner does not match', async () => {
    itemRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'item',
      ownerEmail: 'other@example.com',
      profileJson: genericItem,
    });

    const app = makeApp();
    const res = await app.request(`/items/${itemId}`);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('returns 500 when stored item data is invalid', async () => {
    itemRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'item',
      ownerEmail,
      profileJson: { id: itemId },
    });

    const app = makeApp();
    const res = await app.request(`/items/${itemId}`);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'invalid db data' });
  });

  it('creates a new item when none exists', async () => {
    itemRouteMocks.getEntityProfileMock.mockResolvedValue(undefined);

    const app = makeApp();
    const res = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genericItem),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      item: {
        id: genericItem.id,
        name: genericItem.name,
        category: genericItem.category,
        type: genericItem.type,
        description: genericItem.description,
      },
    });
    expect(itemRouteMocks.createEntityProfileMock).toHaveBeenCalledWith({
      id: genericItem.id,
      entityType: 'item',
      name: genericItem.name,
      ownerEmail,
      visibility: 'public',
      profileJson: genericItem,
    });
  });

  it('prevents updates for mismatched owner on POST', async () => {
    itemRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'item',
      ownerEmail: 'other@example.com',
      profileJson: genericItem,
    });

    const app = makeApp();
    const res = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genericItem),
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not authorized' });
  });

  it('rejects PUT when id does not match payload', async () => {
    const app = makeApp();
    const res = await app.request(`/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...genericItem, id: otherId }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'id mismatch' });
  });

  it('deletes item when owner matches', async () => {
    itemRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'item',
      ownerEmail,
      profileJson: genericItem,
    });

    const app = makeApp();
    const res = await app.request(`/items/${itemId}`, { method: 'DELETE' });

    expect(res.status).toBe(204);
    expect(itemRouteMocks.deleteEntityProfileMock).toHaveBeenCalledWith(itemId);
  });

  it('blocks deletion when owner differs', async () => {
    itemRouteMocks.getEntityProfileMock.mockResolvedValue({
      entityType: 'item',
      ownerEmail: 'other@example.com',
      profileJson: genericItem,
    });

    const app = makeApp();
    const res = await app.request(`/items/${itemId}`, { method: 'DELETE' });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not authorized' });
  });
});
