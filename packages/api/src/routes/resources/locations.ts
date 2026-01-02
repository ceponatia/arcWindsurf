/**
 * Location Maps API Routes
 * CRUD operations for location maps and prefabs.
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
import { pool } from '@minimal-rpg/db/node';
import { generateId } from '@minimal-rpg/utils';
import type { ApiError } from '../../types.js';

// ============================================================================
// Types
// ============================================================================

interface LocationMapRow {
  id: string;
  setting_id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_template: boolean;
  source_template_id: string | null;
  nodes_json: unknown;
  connections_json: unknown;
  default_start_location_id: string | null;
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
}

interface LocationPrefabRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  nodes_json: unknown;
  connections_json: unknown;
  entry_points: string[];
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
}

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

function mapRowToSummary(row: LocationMapRow): LocationMapSummary {
  const nodes = Array.isArray(row.nodes_json) ? row.nodes_json : [];
  const connections = Array.isArray(row.connections_json) ? row.connections_json : [];
  const result: LocationMapSummary = {
    id: row.id,
    name: row.name,
    settingId: row.setting_id,
    isTemplate: row.is_template,
    nodeCount: nodes.length,
    connectionCount: connections.length,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
  if (row.description !== null) result.description = row.description;
  if (row.tags !== null) result.tags = row.tags;
  return result;
}

function mapRowToLocationMap(row: LocationMapRow): LocationMap {
  const nodes = Array.isArray(row.nodes_json) ? (row.nodes_json as LocationNode[]) : [];
  const connections = Array.isArray(row.connections_json)
    ? (row.connections_json as LocationConnection[])
    : [];
  const result: LocationMap = {
    id: row.id,
    name: row.name,
    settingId: row.setting_id,
    isTemplate: row.is_template,
    nodes,
    connections,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
  if (row.description !== null) result.description = row.description;
  if (row.source_template_id !== null) result.sourceTemplateId = row.source_template_id;
  if (row.default_start_location_id !== null)
    result.defaultStartLocationId = row.default_start_location_id;
  if (row.tags !== null) result.tags = row.tags;
  return result;
}

function mapRowToPrefab(row: LocationPrefabRow): LocationPrefab {
  const nodes = Array.isArray(row.nodes_json) ? (row.nodes_json as LocationNode[]) : [];
  const connections = Array.isArray(row.connections_json)
    ? (row.connections_json as LocationConnection[])
    : [];
  const result: LocationPrefab = {
    id: row.id,
    name: row.name,
    nodes,
    connections,
    entryPoints: row.entry_points,
  };
  if (row.description !== null) result.description = row.description;
  if (row.category !== null) result.category = row.category;
  if (row.tags !== null) result.tags = row.tags;
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
    const settingId = c.req.query('setting_id');
    const userId = c.req.query('user_id') ?? 'default';
    const includeInstances = c.req.query('include_instances') === 'true';

    let query = 'SELECT * FROM location_maps WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (settingId) {
      query += ' AND setting_id = $2';
      params.push(settingId);
    }

    if (!includeInstances) {
      query += ` AND is_template = TRUE`;
    }

    query += ' ORDER BY created_at DESC';

    try {
      const result = await pool.query(query, params);
      const summaries = (result.rows as unknown as LocationMapRow[]).map(mapRowToSummary);
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
      const result = await pool.query('SELECT * FROM location_maps WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      const map = mapRowToLocationMap(result.rows[0] as unknown as LocationMapRow);
      return c.json({ ok: true, map }, 200);
    } catch (err) {
      console.error('[API] Failed to get location map:', err);
      return c.json({ ok: false, error: 'failed to get map' } satisfies ApiError, 500);
    }
  });

  // POST /location-maps - create new map
  app.post('/location-maps', async (c) => {
    const userId = c.req.query('user_id') ?? 'default';

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

    const {
      name,
      settingId,
      description,
      isTemplate,
      nodes,
      connections,
      defaultStartLocationId,
      tags,
    } = parsed.data;

    try {
      const id = generateId();
      const result = await pool.query(
        `INSERT INTO location_maps 
         (id, user_id, setting_id, name, description, is_template, nodes_json, connections_json, default_start_location_id, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
         RETURNING *`,
        [
          id,
          userId,
          settingId,
          name,
          description ?? null,
          isTemplate ?? true,
          JSON.stringify(nodes ?? []),
          JSON.stringify(connections ?? []),
          defaultStartLocationId ?? null,
          tags ?? [],
        ]
      );

      const map = mapRowToLocationMap(result.rows[0] as unknown as LocationMapRow);
      return c.json({ ok: true, map }, 201);
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

    const { name, description, nodes, connections, defaultStartLocationId, tags } = parsed.data;

    // Build SET clause dynamically
    const setClauses: string[] = [];
    const values: unknown[] = [id];
    let idx = 2;

    if (name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(name);
    }
    if (description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      values.push(description);
    }
    if (nodes !== undefined) {
      setClauses.push(`nodes_json = $${idx++}::jsonb`);
      values.push(JSON.stringify(nodes));
    }
    if (connections !== undefined) {
      setClauses.push(`connections_json = $${idx++}::jsonb`);
      values.push(JSON.stringify(connections));
    }
    if (defaultStartLocationId !== undefined) {
      setClauses.push(`default_start_location_id = $${idx++}`);
      values.push(defaultStartLocationId);
    }
    if (tags !== undefined) {
      setClauses.push(`tags = $${idx++}`);
      values.push(tags);
    }

    if (setClauses.length === 0) {
      return c.json({ ok: false, error: 'no fields to update' } satisfies ApiError, 400);
    }

    try {
      const result = await pool.query(
        `UPDATE location_maps SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return c.json({ ok: false, error: 'not found' } satisfies ApiError, 404);
      }

      const map = mapRowToLocationMap(result.rows[0] as unknown as LocationMapRow);
      return c.json({ ok: true, map }, 200);
    } catch (err) {
      console.error('[API] Failed to update location map:', err);
      return c.json({ ok: false, error: 'failed to update map' } satisfies ApiError, 500);
    }
  });

  // DELETE /location-maps/:id - delete map
  app.delete('/location-maps/:id', async (c) => {
    const id = c.req.param('id');

    try {
      const result = await pool.query('DELETE FROM location_maps WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
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
    const userId = c.req.query('user_id') ?? 'default';

    try {
      const sourceResult = await pool.query('SELECT * FROM location_maps WHERE id = $1', [id]);

      if (sourceResult.rows.length === 0) {
        return c.json({ ok: false, error: 'source map not found' } satisfies ApiError, 404);
      }

      const source = sourceResult.rows[0] as unknown as LocationMapRow;
      const newId = generateId();

      const result = await pool.query(
        `INSERT INTO location_maps 
         (id, user_id, setting_id, name, description, is_template, source_template_id, nodes_json, connections_json, default_start_location_id, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          newId,
          userId,
          source.setting_id,
          `${source.name} (Copy)`,
          source.description,
          source.is_template,
          source.id, // Reference to original
          source.nodes_json,
          source.connections_json,
          source.default_start_location_id,
          source.tags,
        ]
      );

      const map = mapRowToLocationMap(result.rows[0] as unknown as LocationMapRow);
      return c.json({ ok: true, map }, 201);
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
