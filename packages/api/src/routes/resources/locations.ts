/**
 * Location Maps API Routes
 * CRUD operations for location maps and prefabs using Drizzle repositories.
 */
import type { Hono } from 'hono';
import { z } from 'zod';
import {
  LocationNodeSchema,
  LocationConnectionSchema,
  type LocationMap,
  type LocationPrefab,
} from '@minimal-rpg/schemas';
import {
  createLocationMap,
  getLocationMap,
  listLocationMaps,
  updateLocationMap,
  deleteLocationMap,
  createLocationPrefab,
  getLocationPrefab,
  listLocationPrefabs,
} from '../../db/sessionsClient.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import type { ApiError } from '../../types.js';
import { toId } from '../../utils/uuid.js';

// ============================================================================
// Types
// ============================================================================

interface LocationMapSummary {
  id: string;
  name: string;
  description?: string;
  settingId: string;
  isTemplate: boolean;
  nodeCount: number;
  connectionCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface LocationMapRow {
  id: string;
  ownerEmail?: string | null;
  name: string;
  description?: string | null;
  settingId?: string | null;
  nodesJson?: unknown[] | null;
  connectionsJson?: unknown[] | null;
  defaultStartLocationId?: string | null;
  tags?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LocationPrefabRow {
  id: string;
  ownerEmail?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  nodesJson?: unknown[] | null;
  connectionsJson?: unknown[] | null;
  entryPoints?: string[] | null;
  tags?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const CreateMapSchema = z.object({
  name: z.string().min(1).max(160),
  settingId: z.string().min(1),
  description: z.string().max(500).optional(),
  isTemplate: z.boolean().optional(),
  nodes: z.array(LocationNodeSchema).optional(),
  connections: z.array(LocationConnectionSchema).optional(),
  defaultStartLocationId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateMapSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(500).nullable().optional(),
  nodes: z.array(LocationNodeSchema).optional(),
  connections: z.array(LocationConnectionSchema).optional(),
  defaultStartLocationId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const CreatePrefabSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  nodes: z.array(LocationNodeSchema),
  connections: z.array(LocationConnectionSchema).optional(),
  entryPoints: z.array(z.string().min(1)),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Helpers
// ============================================================================

function mapRowToSummary(row: LocationMapRow): LocationMapSummary {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
  const result: LocationMapSummary = {
    id: row.id,
    name: row.name,
    settingId: row.settingId ?? '',
    isTemplate: true, // Simplified: everything is a template or active session map link
    nodeCount: nodes.length,
    connectionCount: connections.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.description) result.description = row.description ?? undefined;
  if (row.tags) result.tags = row.tags ?? undefined;
  return result;
}

function mapRowToLocationMap(row: LocationMapRow): LocationMap {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
  const result: LocationMap = {
    id: row.id,
    name: row.name,
    settingId: row.settingId ?? '',
    isTemplate: true,
    nodes,
    connections,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.description) result.description = row.description ?? undefined;
  if (row.defaultStartLocationId) result.defaultStartLocationId = row.defaultStartLocationId ?? undefined;
  if (row.tags) result.tags = row.tags ?? undefined;
  return result;
}

function mapRowToPrefab(row: LocationPrefabRow): LocationPrefab {
  const nodes = row.nodesJson ?? [];
  const connections = row.connectionsJson ?? [];
  const result: LocationPrefab = {
    id: row.id,
    name: row.name,
    nodes,
    connections,
    entryPoints: row.entryPoints ?? [],
  };
  if (row.description) result.description = row.description ?? undefined;
  if (row.category) result.category = row.category ?? undefined;
  if (row.tags) result.tags = row.tags ?? undefined;
  return result;
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerLocationMapRoutes(app: Hono): void {
  // ==========================================================================
  // Location Maps CRUD
  // ==========================================================================

  // GET /location-maps - list maps for a setting
  app.get('/location-maps', async (c) => {
    const ownerEmail = getOwnerEmail(c);
    try {
      const maps = (await listLocationMaps(ownerEmail)) as LocationMapRow[];
      const summaries = maps.map((row: LocationMapRow) => mapRowToSummary(row));
      return c.json({ ok: true, maps: summaries }, 200);
    } catch (err) {
      console.error('[API] Failed to list location maps:', err);
      return c.json({ ok: false, error: 'failed to list maps' } satisfies ApiError, 500);
    }
  });

  // GET /location-maps/:id - get full map with nodes and connections
  app.get('/location-maps/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const map = (await getLocationMap(toId(id))) as LocationMapRow | null;
      if (!map) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.json({ ok: true, map: mapRowToLocationMap(map) }, 200);
    } catch (err) {
      console.error('[API] Failed to get location map:', err);
      return c.json({ ok: false, error: 'failed to get map' } satisfies ApiError, 500);
    }
  });

  // POST /location-maps - create new map
  app.post('/location-maps', async (c) => {
    const ownerEmail = getOwnerEmail(c);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = CreateMapSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    try {
      const mapInput: Parameters<typeof createLocationMap>[0] = {
        ownerEmail,
        name: parsed.data.name,
        settingId: parsed.data.settingId,
      };

      if (parsed.data.description !== undefined) {
        mapInput.description = parsed.data.description;
      }
      if (parsed.data.nodes !== undefined) {
        mapInput.nodesJson = parsed.data.nodes;
      }
      if (parsed.data.connections !== undefined) {
        mapInput.connectionsJson = parsed.data.connections;
      }
      if (parsed.data.defaultStartLocationId !== undefined) {
        mapInput.defaultStartLocationId = parsed.data.defaultStartLocationId;
      }
      if (parsed.data.tags !== undefined) {
        mapInput.tags = parsed.data.tags;
      }

      const map = await createLocationMap(mapInput);

      return c.json({ ok: true, map: mapRowToLocationMap(map) }, 201);
    } catch (err) {
      console.error('[API] Failed to create location map:', err);
      return c.json({ ok: false, error: 'failed to create map' } satisfies ApiError, 500);
    }
  });

  // PUT /location-maps/:id - update map
  app.put('/location-maps/:id', async (c) => {
    const id = c.req.param('id');

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = UpdateMapSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    try {
      const updateInput: Parameters<typeof updateLocationMap>[1] = {};

      if (parsed.data.name !== undefined) {
        updateInput.name = parsed.data.name;
      }
      if (parsed.data.description !== undefined) {
        updateInput.description = parsed.data.description;
      }
      if (parsed.data.nodes !== undefined) {
        updateInput.nodesJson = parsed.data.nodes;
      }
      if (parsed.data.connections !== undefined) {
        updateInput.connectionsJson = parsed.data.connections;
      }
      if (parsed.data.defaultStartLocationId !== undefined) {
        updateInput.defaultStartLocationId = parsed.data.defaultStartLocationId;
      }
      if (parsed.data.tags !== undefined) {
        updateInput.tags = parsed.data.tags;
      }

      const updated = await updateLocationMap(toId(id), updateInput);

      if (!updated) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      return c.json({ ok: true, map: mapRowToLocationMap(updated) }, 200);
    } catch (err) {
      console.error('[API] Failed to update location map:', err);
      return c.json({ ok: false, error: 'failed to update map' } satisfies ApiError, 500);
    }
  });

  // DELETE /location-maps/:id - delete map
  app.delete('/location-maps/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const deleted = await deleteLocationMap(id);
      if (!deleted) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.body(null, 204);
    } catch (err) {
      console.error('[API] Failed to delete location map:', err);
      return c.json({ ok: false, error: 'failed to delete map' } satisfies ApiError, 500);
    }
  });

  // POST /location-maps/:id/duplicate - create a copy of a map
  app.post('/location-maps/:id/duplicate', async (c) => {
    const id = c.req.param('id');
    const ownerEmail = getOwnerEmail(c);

    try {
      const source = await getLocationMap(toId(id));
      if (!source) {
        return c.json({ ok: false, error: 'source map not found' } satisfies ApiError, 404);
      }

      const duplicateInput: Parameters<typeof createLocationMap>[0] = {
        ownerEmail,
        name: `${source.name} (Copy)`,
        settingId: source.settingId ?? '',
        nodesJson: (source.nodesJson ?? []) as unknown[],
        connectionsJson: (source.connectionsJson ?? []) as unknown[],
      };

      if (source.description !== undefined) {
        duplicateInput.description = source.description;
      }
      if (source.defaultStartLocationId !== undefined) {
        duplicateInput.defaultStartLocationId = source.defaultStartLocationId;
      }
      if (source.tags !== undefined) {
        duplicateInput.tags = source.tags ?? [];
      }

      const map = await createLocationMap(duplicateInput);

      return c.json({ ok: true, map: mapRowToLocationMap(map) }, 201);
    } catch (err) {
      console.error('[API] Failed to duplicate location map:', err);
      return c.json({ ok: false, error: 'failed to duplicate map' } satisfies ApiError, 500);
    }
  });

  // ==========================================================================
  // Prefabs CRUD
  // ==========================================================================

  // GET /location-prefabs - list prefabs
  app.get('/location-prefabs', async (c) => {
    const category = c.req.query('category');
    try {
      const prefabs = (await listLocationPrefabs(category)) as LocationPrefabRow[];
      return c.json(
        { ok: true, prefabs: prefabs.map((row: LocationPrefabRow) => mapRowToPrefab(row)) },
        200
      );
    } catch (err) {
      console.error('[API] Failed to list prefabs:', err);
      return c.json({ ok: false, error: 'failed to list prefabs' } satisfies ApiError, 500);
    }
  });

  // GET /location-prefabs/:id - get single prefab
  app.get('/location-prefabs/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const prefab = (await getLocationPrefab(toId(id))) as LocationPrefabRow | null;
      if (!prefab) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }
      return c.json({ ok: true, prefab: mapRowToPrefab(prefab) }, 200);
    } catch (err) {
      console.error('[API] Failed to get prefab:', err);
      return c.json({ ok: false, error: 'failed to get prefab' } satisfies ApiError, 500);
    }
  });

  // POST /location-prefabs - create prefab
  app.post('/location-prefabs', async (c) => {
    const ownerEmail = getOwnerEmail(c);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: 'invalid json body' } satisfies ApiError, 400);
    }

    const parsed = CreatePrefabSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ ok: false, error: parsed.error.flatten() } satisfies ApiError, 400);
    }

    try {
      const prefabInput: Parameters<typeof createLocationPrefab>[0] = {
        ownerEmail,
        name: parsed.data.name,
        nodesJson: parsed.data.nodes,
        entryPoints: parsed.data.entryPoints,
      };

      if (parsed.data.description !== undefined) {
        prefabInput.description = parsed.data.description;
      }
      if (parsed.data.category !== undefined) {
        prefabInput.category = parsed.data.category;
      }
      if (parsed.data.connections !== undefined) {
        prefabInput.connectionsJson = parsed.data.connections;
      }
      if (parsed.data.tags !== undefined) {
        prefabInput.tags = parsed.data.tags;
      }

      const prefab = await createLocationPrefab(prefabInput);

      return c.json({ ok: true, prefab: mapRowToPrefab(prefab) }, 201);
    } catch (err) {
      console.error('[API] Failed to create prefab:', err);
      return c.json({ ok: false, error: 'failed to create prefab' } satisfies ApiError, 500);
    }
  });
}
