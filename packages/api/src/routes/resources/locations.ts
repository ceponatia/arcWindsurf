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
  type LocationNode,
  type LocationConnection,
  type LocationPrefab,
} from '@minimal-rpg/schemas';
import {
  createLocationMap,
  getLocationMap,
  listLocationMaps,
  createLocationPrefab,
  getLocationPrefab,
  listLocationPrefabs,
} from '../../db/sessionsClient.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';
import type { ApiError } from '../../types.js';

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

function mapRowToSummary(row: any): LocationMapSummary {
  const nodes = Array.isArray(row.nodesJson) ? row.nodesJson : [];
  const connections = Array.isArray(row.connectionsJson) ? row.connectionsJson : [];
  const result: LocationMapSummary = {
    id: row.id,
    name: row.name,
    settingId: row.settingId,
    isTemplate: true, // Simplified: everything is a template or active session map link
    nodeCount: nodes.length,
    connectionCount: connections.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.description) result.description = row.description;
  if (row.tags) result.tags = row.tags;
  return result;
}

function mapRowToLocationMap(row: any): LocationMap {
  const nodes = Array.isArray(row.nodesJson) ? (row.nodesJson as LocationNode[]) : [];
  const connections = Array.isArray(row.connectionsJson)
    ? (row.connectionsJson as LocationConnection[])
    : [];
  const result: LocationMap = {
    id: row.id,
    name: row.name,
    settingId: row.settingId,
    isTemplate: true,
    nodes,
    connections,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.description) result.description = row.description;
  if (row.defaultStartLocationId) result.defaultStartLocationId = row.defaultStartLocationId;
  if (row.tags) result.tags = row.tags;
  return result;
}

function mapRowToPrefab(row: any): LocationPrefab {
  const nodes = Array.isArray(row.nodesJson) ? (row.nodesJson as LocationNode[]) : [];
  const connections = Array.isArray(row.connectionsJson)
    ? (row.connectionsJson as LocationConnection[])
    : [];
  const result: LocationPrefab = {
    id: row.id,
    name: row.name,
    nodes,
    connections,
    entryPoints: row.entryPoints,
  };
  if (row.description) result.description = row.description;
  if (row.category) result.category = row.category;
  if (row.tags) result.tags = row.tags;
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
      const maps = await listLocationMaps(ownerEmail);
      const summaries = maps.map(mapRowToSummary);
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
      const map = await getLocationMap(id as any);
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
    let body: any;
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
      const map = await createLocationMap({
        ownerEmail,
        name: parsed.data.name,
        settingId: parsed.data.settingId as any,
        description: parsed.data.description,
        nodesJson: parsed.data.nodes,
        connectionsJson: parsed.data.connections,
        defaultStartLocationId: parsed.data.defaultStartLocationId as any,
        tags: parsed.data.tags,
      });

      return c.json({ ok: true, map: mapRowToLocationMap(map) }, 201);
    } catch (err) {
      console.error('[API] Failed to create location map:', err);
      return c.json({ ok: false, error: 'failed to create map' } satisfies ApiError, 500);
    }
  });

  // PUT /location-maps/:id - update map
  app.put('/location-maps/:id', async (c) => {
    const id = c.req.param('id');
    const ownerEmail = getOwnerEmail(c);

    let body: any;
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
      const updated = await updateLocationMap(id as any, {
        name: parsed.data.name,
        description: parsed.data.description ?? undefined,
        nodesJson: parsed.data.nodes,
        connectionsJson: parsed.data.connections,
        defaultStartLocationId: parsed.data.defaultStartLocationId as any,
        tags: parsed.data.tags,
      });

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
      const deleted = await deleteLocationMap(id as any);
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
      const source = await getLocationMap(id as any);
      if (!source) {
        return c.json({ ok: false, error: 'source map not found' } satisfies ApiError, 404);
      }

      const map = await createLocationMap({
        ownerEmail,
        name: `${source.name} (Copy)`,
        settingId: source.settingId as any,
        description: source.description ?? undefined,
        nodesJson: (source.nodesJson as any[]) ?? [],
        connectionsJson: (source.connectionsJson as any[]) ?? [],
        defaultStartLocationId: source.defaultStartLocationId as any,
        tags: source.tags ?? [],
      });

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
      const prefabs = await listLocationPrefabs(category);
      return c.json({ ok: true, prefabs: prefabs.map(mapRowToPrefab) }, 200);
    } catch (err) {
      console.error('[API] Failed to list prefabs:', err);
      return c.json({ ok: false, error: 'failed to list prefabs' } satisfies ApiError, 500);
    }
  });

  // GET /location-prefabs/:id - get single prefab
  app.get('/location-prefabs/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const prefab = await getLocationPrefab(id as any);
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
    let body: any;
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
      const prefab = await createLocationPrefab({
        ownerEmail,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        nodesJson: parsed.data.nodes,
        connectionsJson: parsed.data.connections,
        entryPoints: parsed.data.entryPoints,
        tags: parsed.data.tags,
      });

      return c.json({ ok: true, prefab: mapRowToPrefab(prefab) }, 201);
    } catch (err) {
      console.error('[API] Failed to create prefab:', err);
      return c.json({ ok: false, error: 'failed to create prefab' } satisfies ApiError, 500);
    }
  });
}

  // ==========================================================================
  // Prefabs CRUD
  // ==========================================================================

  // GET /location-prefabs - list prefabs
  app.get('/location-prefabs', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';
    const category = c.req.query('category');

    let query = 'SELECT * FROM location_prefabs WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    query += ' ORDER BY category, name';

    try {
      const result = await pool.query(query, params);
      const prefabs = (result.rows as unknown as LocationPrefabRow[]).map(mapRowToPrefab);
      return c.json({ ok: true, prefabs }, 200);
    } catch (err) {
      console.error('[API] Failed to list prefabs:', err);
      return c.json({ ok: false, error: 'failed to list prefabs' } satisfies ApiError, 500);
    }
  });

  // GET /location-prefabs/:id - get single prefab
  app.get('/location-prefabs/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const result = await pool.query('SELECT * FROM location_prefabs WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      const prefab = mapRowToPrefab(result.rows[0] as unknown as LocationPrefabRow);
      return c.json({ ok: true, prefab }, 200);
    } catch (err) {
      console.error('[API] Failed to get prefab:', err);
      return c.json({ ok: false, error: 'failed to get prefab' } satisfies ApiError, 500);
    }
  });

  // POST /location-prefabs - create prefab
  app.post('/location-prefabs', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';

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

    const { name, description, category, nodes, connections, entryPoints, tags } = parsed.data;

    try {
      const id = generateId();
      const result = await pool.query(
        `INSERT INTO location_prefabs 
         (id, user_id, name, description, category, nodes_json, connections_json, entry_points, tags)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
         RETURNING *`,
        [
          id,
          userId,
          name,
          description ?? null,
          category ?? null,
          JSON.stringify(nodes),
          JSON.stringify(connections ?? []),
          entryPoints,
          tags ?? [],
        ]
      );

      const prefab = mapRowToPrefab(result.rows[0] as unknown as LocationPrefabRow);
      return c.json({ ok: true, prefab }, 201);
    } catch (err) {
      console.error('[API] Failed to create prefab:', err);
      return c.json({ ok: false, error: 'failed to create prefab' } satisfies ApiError, 500);
    }
  });

  // DELETE /location-prefabs/:id - delete prefab
  app.delete('/location-prefabs/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const result = await pool.query('DELETE FROM location_prefabs WHERE id = $1 RETURNING id', [
        id,
      ]);

      if (result.rows.length === 0) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      return c.body(null, 204);
    } catch (err) {
      console.error('[API] Failed to delete prefab:', err);
      return c.json({ ok: false, error: 'failed to delete prefab' } satisfies ApiError, 500);
    }
  });
}
