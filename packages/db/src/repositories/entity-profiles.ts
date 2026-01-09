import { drizzle as db } from '../connection/index.js';
import { entityProfiles } from '../schema/index.js';
import { eq, and, or } from 'drizzle-orm';
import type { UUID } from '../types.js';

export interface CreateEntityProfileInput {
  entityType: string;
  name: string;
  ownerEmail?: string;
  visibility?: string;
  tier?: string;
  profileJson?: Record<string, unknown>;
  tags?: string[];
  embedding?: number[];
}

export async function createEntityProfile(input: CreateEntityProfileInput) {
  const [result] = await db
    .insert(entityProfiles)
    .values({
      entityType: input.entityType,
      name: input.name,
      ownerEmail: input.ownerEmail ?? 'public',
      visibility: input.visibility ?? 'public',
      tier: input.tier,
      profileJson: input.profileJson ?? {},
      tags: input.tags ?? [],
      embedding: input.embedding,
    })
    .returning();
  return result;
}

export async function getEntityProfile(id: UUID) {
  const [result] = await db.select().from(entityProfiles).where(eq(entityProfiles.id, id)).limit(1);
  return result;
}

export async function listEntityProfiles(options: {
  entityType?: string;
  ownerEmail?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(entityProfiles).$dynamic();
  const filters = [];

  if (options.entityType) {
    filters.push(eq(entityProfiles.entityType, options.entityType));
  }
  if (options.ownerEmail) {
    if (options.visibility === 'public') {
      filters.push(
        or(
          eq(entityProfiles.ownerEmail, options.ownerEmail),
          eq(entityProfiles.visibility, 'public')
        )
      );
    } else {
      filters.push(eq(entityProfiles.ownerEmail, options.ownerEmail));
    }
  } else if (options.visibility) {
    filters.push(eq(entityProfiles.visibility, options.visibility));
  }

  if (filters.length > 0) {
    query = query.where(and(...filters));
  }

  return query.limit(options.limit ?? 50).offset(options.offset ?? 0);
}

export async function updateEntityProfile(id: UUID, updates: Partial<CreateEntityProfileInput>) {
  const [result] = await db
    .update(entityProfiles)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(entityProfiles.id, id))
    .returning();
  return result;
}

export async function deleteEntityProfile(id: UUID) {
  await db.delete(entityProfiles).where(eq(entityProfiles.id, id));
}
