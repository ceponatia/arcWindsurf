import { drizzle as db } from '../connection/index.js';
import { locations } from '../schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import type { UUID } from '../types.js';

export interface CreateLocationInput {
  ownerEmail?: string;
  settingId?: UUID;
  name: string;
  type?: string;
  description?: string;
  summary?: string;
  isTemplate?: boolean;
  tags?: string[];
  properties?: Record<string, unknown>;
  atmosphere?: Record<string, unknown>;
  capacity?: number;
  accessibility?: string;
  parentLocationId?: UUID;
  embedding?: number[];
}

export async function createLocation(input: CreateLocationInput) {
  const [result] = await db
    .insert(locations)
    .values({
      ownerEmail: input.ownerEmail ?? 'system',
      settingId: input.settingId,
      name: input.name,
      type: input.type ?? 'room',
      description: input.description,
      summary: input.summary,
      isTemplate: input.isTemplate ?? false,
      tags: input.tags ?? [],
      properties: input.properties ?? {},
      atmosphere: input.atmosphere ?? {},
      capacity: input.capacity,
      accessibility: input.accessibility ?? 'open',
      parentLocationId: input.parentLocationId,
      embedding: input.embedding,
    })
    .returning();
  return result;
}

export async function getLocation(id: UUID) {
  const [result] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
  return result;
}

export async function listLocations(options: {
  ownerEmail?: string;
  settingId?: UUID;
  isTemplate?: boolean;
  parentLocationId?: UUID;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(locations).$dynamic();
  const filters = [];

  if (options.ownerEmail) filters.push(eq(locations.ownerEmail, options.ownerEmail));
  if (options.settingId) filters.push(eq(locations.settingId, options.settingId));
  if (options.isTemplate !== undefined) filters.push(eq(locations.isTemplate, options.isTemplate));
  if (options.parentLocationId)
    filters.push(eq(locations.parentLocationId, options.parentLocationId));

  if (filters.length > 0) {
    query = query.where(and(...filters));
  }

  return query.limit(options.limit ?? 100).offset(options.offset ?? 0);
}

export async function updateLocation(id: UUID, updates: Partial<CreateLocationInput>) {
  const [result] = await db
    .update(locations)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(locations.id, id))
    .returning();
  return result;
}

export async function deleteLocation(id: UUID) {
  await db.delete(locations).where(eq(locations.id, id));
}
