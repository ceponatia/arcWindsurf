import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const locationRouteMocks = vi.hoisted(() => ({
  listLocationMapsMock: vi.fn(),
  getLocationMapMock: vi.fn(),
  createLocationMapMock: vi.fn(),
  updateLocationMapMock: vi.fn(),
  deleteLocationMapMock: vi.fn(),
  createLocationPrefabMock: vi.fn(),
  getLocationPrefabMock: vi.fn(),
  listLocationPrefabsMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

class MockLocationDataValidationError extends Error {
  readonly details: {
    entity: 'map' | 'prefab';
    recordId?: string;
    fields: ('nodesJson' | 'connectionsJson')[];
    issues: unknown[];
  };

  constructor(details: {
    entity: 'map' | 'prefab';
    recordId?: string;
    fields: ('nodesJson' | 'connectionsJson')[];
    issues: unknown[];
  }) {
    super('Location data is invalid');
    this.name = 'LocationDataValidationError';
    this.details = details;
  }
}

vi.mock('@minimal-rpg/db/node', () => ({
  LocationDataValidationError: MockLocationDataValidationError,
}));

vi.mock('../../../src/db/sessionsClient.js', () => ({
  listLocationMaps: locationRouteMocks.listLocationMapsMock,
  getLocationMap: locationRouteMocks.getLocationMapMock,
  createLocationMap: locationRouteMocks.createLocationMapMock,
  updateLocationMap: locationRouteMocks.updateLocationMapMock,
  deleteLocationMap: locationRouteMocks.deleteLocationMapMock,
  createLocationPrefab: locationRouteMocks.createLocationPrefabMock,
  getLocationPrefab: locationRouteMocks.getLocationPrefabMock,
  listLocationPrefabs: locationRouteMocks.listLocationPrefabsMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: locationRouteMocks.getOwnerEmailMock,
}));

interface LocationRoutesModule {
  registerLocationMapRoutes: (app: Hono) => void;
}

const { registerLocationMapRoutes } = (await import(
  '../../../src/routes/resources/locations.js'
)) as LocationRoutesModule;

const ownerEmail = 'owner@example.com';
const mapId = '11111111-1111-1111-1111-111111111111';
const prefabId = '22222222-2222-2222-2222-222222222222';

const createdAt = new Date('2026-02-03T12:00:00.000Z');
const updatedAt = new Date('2026-02-03T12:30:00.000Z');

const mapRow = {
  id: mapId,
  ownerEmail,
  name: 'Test Map',
  description: 'A place',
  settingId: 'setting-1',
  nodesJson: [
    {
      id: 'node-1',
      name: 'Region',
      type: 'region',
      parentId: null,
      depth: 0,
    },
  ],
  connectionsJson: [],
  defaultStartLocationId: 'node-1',
  tags: ['coastal'],
  createdAt,
  updatedAt,
};

const prefabRow = {
  id: prefabId,
  ownerEmail,
  name: 'Prefab',
  description: 'Prefab desc',
  category: 'region',
  nodesJson: [
    {
      id: 'node-2',
      name: 'Room',
      type: 'room',
      parentId: null,
      depth: 2,
    },
  ],
  connectionsJson: [],
  entryPoints: ['node-2'],
  tags: ['indoor'],
  createdAt,
  updatedAt,
};

const createMapRequest = {
  name: 'New Map',
  settingId: 'setting-2',
  nodes: [
    {
      id: 'node-3',
      name: 'Village',
      type: 'region',
      parentId: null,
      depth: 0,
    },
  ],
  connections: [],
};

const createPrefabRequest = {
  name: 'Prefab Two',
  nodes: [
    {
      id: 'node-4',
      name: 'Room',
      type: 'room',
      parentId: null,
      depth: 2,
    },
  ],
  entryPoints: ['node-4'],
};

/**
 * Build a Hono app with location map routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerLocationMapRoutes(app);
  return app;
}

describe('routes/resources/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationRouteMocks.getOwnerEmailMock.mockReturnValue(ownerEmail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists location map summaries', async () => {
    locationRouteMocks.listLocationMapsMock.mockResolvedValue([mapRow]);

    const app = makeApp();
    const res = await app.request('/location-maps');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      maps: [
        {
          id: mapRow.id,
          name: mapRow.name,
          description: mapRow.description,
          settingId: mapRow.settingId,
          isTemplate: true,
          nodeCount: 1,
          connectionCount: 0,
          tags: mapRow.tags,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ],
    });
  });

  it('returns location data errors with a structured response', async () => {
    locationRouteMocks.listLocationMapsMock.mockRejectedValue(
      new MockLocationDataValidationError({
        entity: 'map',
        recordId: mapId,
        fields: ['nodesJson'],
        issues: [],
      })
    );

    const app = makeApp();
    const res = await app.request('/location-maps');

    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: Record<string, unknown> };
    expect(body.ok).toBe(false);
    expect(body.error).toMatchObject({
      type: 'invalid_location_data',
      entity: 'map',
      recordId: mapId,
      fields: ['nodesJson'],
    });
  });

  it('returns a location map by id', async () => {
    locationRouteMocks.getLocationMapMock.mockResolvedValue(mapRow);

    const app = makeApp();
    const res = await app.request(`/location-maps/${mapId}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; map: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.map.id).toBe(mapId);
  });

  it('returns 404 when map is missing', async () => {
    locationRouteMocks.getLocationMapMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/location-maps/${mapId}`);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('creates a location map', async () => {
    locationRouteMocks.createLocationMapMock.mockResolvedValue({
      ...mapRow,
      id: 'map-new',
      name: createMapRequest.name,
      settingId: createMapRequest.settingId,
    });

    const app = makeApp();
    const res = await app.request('/location-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createMapRequest),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; map: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.map.id).toBe('map-new');
  });

  it('updates a location map', async () => {
    locationRouteMocks.updateLocationMapMock.mockResolvedValue(mapRow);

    const app = makeApp();
    const res = await app.request(`/location-maps/${mapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated name' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; map: { name: string } };
    expect(body.ok).toBe(true);
    expect(body.map.name).toBe(mapRow.name);
  });

  it('returns 404 when update target is missing', async () => {
    locationRouteMocks.updateLocationMapMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/location-maps/${mapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated name' }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'not found' });
  });

  it('deletes a location map', async () => {
    locationRouteMocks.deleteLocationMapMock.mockResolvedValue(true);

    const app = makeApp();
    const res = await app.request(`/location-maps/${mapId}`, { method: 'DELETE' });

    expect(res.status).toBe(204);
  });

  it('duplicates a location map', async () => {
    locationRouteMocks.getLocationMapMock.mockResolvedValue(mapRow);
    locationRouteMocks.createLocationMapMock.mockResolvedValue({
      ...mapRow,
      id: 'map-copy',
      name: `${mapRow.name} (Copy)`,
    });

    const app = makeApp();
    const res = await app.request(`/location-maps/${mapId}/duplicate`, { method: 'POST' });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; map: { id: string; name: string } };
    expect(body.ok).toBe(true);
    expect(body.map.id).toBe('map-copy');
    expect(body.map.name).toBe(`${mapRow.name} (Copy)`);
  });

  it('returns 404 when duplicate source is missing', async () => {
    locationRouteMocks.getLocationMapMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(`/location-maps/${mapId}/duplicate`, { method: 'POST' });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'source map not found' });
  });

  it('lists prefabs with safe parsing', async () => {
    locationRouteMocks.listLocationPrefabsMock.mockResolvedValue([
      { ...prefabRow, nodesJson: [{ id: 'bad' }] },
    ]);

    const app = makeApp();
    const res = await app.request('/location-prefabs?category=region');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; prefabs: { nodes: unknown[] }[] };
    expect(body.ok).toBe(true);
    expect(body.prefabs[0]?.nodes).toEqual([]);
  });

  it('returns a prefab by id', async () => {
    locationRouteMocks.getLocationPrefabMock.mockResolvedValue(prefabRow);

    const app = makeApp();
    const res = await app.request(`/location-prefabs/${prefabId}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; prefab: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.prefab.id).toBe(prefabId);
  });

  it('creates a prefab', async () => {
    locationRouteMocks.createLocationPrefabMock.mockResolvedValue(prefabRow);

    const app = makeApp();
    const res = await app.request('/location-prefabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPrefabRequest),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; prefab: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.prefab.id).toBe(prefabId);
  });
});
