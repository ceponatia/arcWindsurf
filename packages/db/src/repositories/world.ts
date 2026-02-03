import { drizzle as db } from '../connection/index.js';
import {
  locationMaps,
  locationPrefabs,
  sessions,
} from '../schema/index.js';
import { eq } from 'drizzle-orm';
import type { UUID } from '../types.js';
import type { LocationConnectionSummary } from './types.js';
import {
  LocationConnectionSchema,
  LocationNodeSchema,
  type LocationConnection,
  type LocationNode,
} from '@minimal-rpg/schemas';
import type { ZodIssue } from 'zod';

export type LocationDataEntity = 'map' | 'prefab';

export interface LocationDataValidationDetails {
  entity: LocationDataEntity;
  recordId?: string;
  fields: Array<'nodesJson' | 'connectionsJson'>;
  issues: ZodIssue[];
}

export class LocationDataValidationError extends Error {
  readonly details: LocationDataValidationDetails;

  constructor(details: LocationDataValidationDetails) {
    super('Location data is invalid');
    this.name = 'LocationDataValidationError';
    this.details = details;
  }
}

/**
 * Validate location nodes/connections JSON, throwing on invalid data.
 */
function parseLocationJson(
  entity: LocationDataEntity,
  recordId: string | undefined,
  nodesJson: unknown[] | undefined,
  connectionsJson: unknown[] | undefined
): { nodesJson: LocationNode[]; connectionsJson: LocationConnection[] } {
  const nodesResult = LocationNodeSchema.array().safeParse(nodesJson ?? []);
  const connectionsResult = LocationConnectionSchema.array().safeParse(
    connectionsJson ?? []
  );

  if (nodesResult.success && connectionsResult.success) {
    return {
      nodesJson: nodesResult.data,
      connectionsJson: connectionsResult.data,
    };
  }

  const fields: Array<'nodesJson' | 'connectionsJson'> = [];
  const issues: ZodIssue[] = [];

  if (!nodesResult.success) {
    fields.push('nodesJson');
    issues.push(...nodesResult.error.issues);
  }

  if (!connectionsResult.success) {
    fields.push('connectionsJson');
    issues.push(...connectionsResult.error.issues);
  }

  const details: LocationDataValidationDetails = {
    entity,
    fields,
    issues,
  };
  if (recordId !== undefined) {
    details.recordId = recordId;
  }
  throw new LocationDataValidationError(details);
}

/**
 * Validate partial location JSON updates without overwriting missing fields.
 */
function validateLocationJsonUpdate(
  entity: LocationDataEntity,
  recordId: string | undefined,
  updates: Partial<Pick<CreateLocationMapInput, 'nodesJson' | 'connectionsJson'>>
): void {
  const fields: Array<'nodesJson' | 'connectionsJson'> = [];
  const issues: ZodIssue[] = [];

  if (updates.nodesJson !== undefined) {
    const result = LocationNodeSchema.array().safeParse(updates.nodesJson);
    if (result.success) {
      updates.nodesJson = result.data;
    } else {
      fields.push('nodesJson');
      issues.push(...result.error.issues);
    }
  }

  if (updates.connectionsJson !== undefined) {
    const result = LocationConnectionSchema.array().safeParse(updates.connectionsJson);
    if (result.success) {
      updates.connectionsJson = result.data;
    } else {
      fields.push('connectionsJson');
      issues.push(...result.error.issues);
    }
  }

  if (issues.length > 0) {
    const details: LocationDataValidationDetails = {
      entity,
      fields,
      issues,
    };
    if (recordId !== undefined) {
      details.recordId = recordId;
    }
    throw new LocationDataValidationError(details);
  }
}

// =============================================================================
// Location Maps
// =============================================================================

export interface CreateLocationMapInput {
  ownerEmail?: string;
  name: string;
  description?: string;
  settingId?: string;
  nodesJson?: unknown[];
  connectionsJson?: unknown[];
  defaultStartLocationId?: string;
  tags?: string[];
}

export async function createLocationMap(input: CreateLocationMapInput) {
  const validated = parseLocationJson(
    'map',
    undefined,
    input.nodesJson ?? [],
    input.connectionsJson ?? []
  );
  const [result] = await db
    .insert(locationMaps)
    .values({
      ownerEmail: input.ownerEmail ?? 'system',
      name: input.name,
      description: input.description,
      settingId: input.settingId,
      nodesJson: validated.nodesJson,
      connectionsJson: validated.connectionsJson,
      defaultStartLocationId: input.defaultStartLocationId,
      tags: input.tags ?? [],
    })
    .returning();
  return result;
}

export async function getLocationMap(id: UUID) {
  const [result] = await db.select().from(locationMaps).where(eq(locationMaps.id, id)).limit(1);
  if (!result) return result;
  const validated = parseLocationJson(
    'map',
    result.id,
    Array.isArray(result.nodesJson) ? result.nodesJson : [],
    Array.isArray(result.connectionsJson) ? result.connectionsJson : []
  );
  return {
    ...result,
    nodesJson: validated.nodesJson,
    connectionsJson: validated.connectionsJson,
  };
}

export async function listLocationMaps(ownerEmail?: string) {
  const query = db.select().from(locationMaps);
  return ownerEmail
    ? await query.where(eq(locationMaps.ownerEmail, ownerEmail))
    : await query;
}

export async function updateLocationMap(id: UUID, updates: Partial<CreateLocationMapInput>) {
  if (updates.nodesJson !== undefined || updates.connectionsJson !== undefined) {
    validateLocationJsonUpdate('map', id, updates);
  }
  const [result] = await db
    .update(locationMaps)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(locationMaps.id, id))
    .returning();
  return result;
}

export async function deleteLocationMap(id: UUID) {
  const [deleted] = await db.delete(locationMaps).where(eq(locationMaps.id, id)).returning();
  return !!deleted;
}

/**
 * Get outgoing location connections for a session and location.
 */
export async function getLocationConnections(
  sessionId: UUID,
  locationId: string
): Promise<LocationConnectionSummary[]> {
  const sessionRow = await db
    .select({ locationMapId: sessions.locationMapId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const mapId = sessionRow[0]?.locationMapId;
  if (!mapId) return [];

  const map = await getLocationMap(mapId);
  if (!map) return [];

  const { nodesJson: nodes, connectionsJson: connections } = parseLocationJson(
    'map',
    map.id,
    map.nodesJson ?? [],
    map.connectionsJson ?? []
  );
  const nodeNames = new Map(nodes.map((node) => [node.id, node.name]));

  const results: LocationConnectionSummary[] = [];

  for (const connection of connections) {
    if (connection.fromLocationId === locationId) {
      const targetName = nodeNames.get(connection.toLocationId);
      const lockReason = connection.lockReason;
      const summary: LocationConnectionSummary = {
        connectionId: connection.id,
        targetLocationId: connection.toLocationId,
        locked: connection.locked,
      };
      if (targetName !== undefined) summary.targetName = targetName;
      if (lockReason !== undefined) summary.lockReason = lockReason;
      results.push(summary);
    }

    if (connection.bidirectional && connection.toLocationId === locationId) {
      const targetName = nodeNames.get(connection.fromLocationId);
      const lockReason = connection.lockReason;
      const summary: LocationConnectionSummary = {
        connectionId: connection.id,
        targetLocationId: connection.fromLocationId,
        locked: connection.locked,
      };
      if (targetName !== undefined) summary.targetName = targetName;
      if (lockReason !== undefined) summary.lockReason = lockReason;
      results.push(summary);
    }
  }

  return results;
}

// =============================================================================
// Location Prefabs
// =============================================================================

export interface CreateLocationPrefabInput {
  ownerEmail?: string;
  name: string;
  type?: string;
  description?: string;
  category?: string;
  nodesJson?: unknown[];
  connectionsJson?: unknown[];
  entryPoints?: string[];
  tags?: string[];
}

export async function createLocationPrefab(input: CreateLocationPrefabInput) {
  const validated = parseLocationJson(
    'prefab',
    undefined,
    input.nodesJson ?? [],
    input.connectionsJson ?? []
  );
  const [result] = await db
    .insert(locationPrefabs)
    .values({
      ownerEmail: input.ownerEmail ?? 'system',
      name: input.name,
      type: input.type ?? 'building',
      description: input.description,
      category: input.category,
      nodesJson: validated.nodesJson,
      connectionsJson: validated.connectionsJson,
      entryPoints: input.entryPoints ?? [],
      tags: input.tags ?? [],
    })
    .returning();
  return result;
}

export async function getLocationPrefab(id: UUID) {
  const [result] = await db
    .select()
    .from(locationPrefabs)
    .where(eq(locationPrefabs.id, id))
    .limit(1);
  if (!result) return result;
  const validated = parseLocationJson(
    'prefab',
    result.id,
    Array.isArray(result.nodesJson) ? result.nodesJson : [],
    Array.isArray(result.connectionsJson) ? result.connectionsJson : []
  );
  return {
    ...result,
    nodesJson: validated.nodesJson,
    connectionsJson: validated.connectionsJson,
  };
}

export async function listLocationPrefabs(category?: string) {
  const query = db.select().from(locationPrefabs);
  return category
    ? await query.where(eq(locationPrefabs.category, category))
    : await query;
}
