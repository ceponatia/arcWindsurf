import { drizzle as db } from '../connection/index.js';
import {
  locationMaps,
  locationPrefabs,
} from '../schema/index.js';
import { eq } from 'drizzle-orm';
import type { UUID } from '../types.js';

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
  const [result] = await db
    .insert(locationMaps)
    .values({
      ownerEmail: input.ownerEmail ?? 'system',
      name: input.name,
      description: input.description,
      settingId: input.settingId,
      nodesJson: input.nodesJson ?? [],
      connectionsJson: input.connectionsJson ?? [],
      defaultStartLocationId: input.defaultStartLocationId,
      tags: input.tags ?? [],
    })
    .returning();
  return result;
}

export async function getLocationMap(id: UUID) {
  const [result] = await db.select().from(locationMaps).where(eq(locationMaps.id, id)).limit(1);
  return result;
}

export async function listLocationMaps(ownerEmail?: string) {
  const query = db.select().from(locationMaps);
  if (ownerEmail) {
    return query.where(eq(locationMaps.ownerEmail, ownerEmail));
  }
  return query;
}

export async function updateLocationMap(id: UUID, updates: Partial<CreateLocationMapInput>) {
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
  const [result] = await db
    .insert(locationPrefabs)
    .values({
      ownerEmail: input.ownerEmail ?? 'system',
      name: input.name,
      type: input.type ?? 'building',
      description: input.description,
      category: input.category,
      nodesJson: input.nodesJson ?? [],
      connectionsJson: input.connectionsJson ?? [],
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
  return result;
}

export async function listLocationPrefabs(category?: string) {
  const query = db.select().from(locationPrefabs);
  if (category) {
    return query.where(eq(locationPrefabs.category, category));
  }
  return query;
}
