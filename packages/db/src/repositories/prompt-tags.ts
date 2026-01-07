import { eq, and, or } from 'drizzle-orm';
import { db } from '../index.js';
import { promptTags, sessionTags } from '../schema/index.js';
import type { UUID } from '../types.js';
import type {
  ListTagsOptions,
  CreateTagInput,
  UpdateTagInput,
  CreateBindingInput,
} from './types.js';

export async function listPromptTags(options: ListTagsOptions = {}) {
  // Simplification: ignoring owner/visibility for now as they are not in schema
  let query = db.select().from(promptTags);

  // We only support category and isActive (mapping isBuiltIn to isActive for now or just ignoring)
  const filters = [];
  if (options.category) {
    filters.push(eq(promptTags.category, options.category));
  }
  if (options.isBuiltIn !== undefined) {
    // simplified: just filter by isActive
    filters.push(eq(promptTags.isActive, options.isBuiltIn));
  }

  if (filters.length > 0) {
    return await query.where(and(...filters));
  }
  return await query;
}

export async function getPromptTag(id: UUID, owner?: string) {
  const result = await db.select().from(promptTags).where(eq(promptTags.id, id)).limit(1);
  return result[0];
}

export async function createPromptTag(input: CreateTagInput) {
  const [tag] = await db
    .insert(promptTags)
    .values({
      name: input.name,
      promptText: input.promptText,
      category: input.category ?? 'style',
      description: input.shortDescription,
      isActive: true,
    })
    .returning();
  return tag;
}

export async function updatePromptTag(id: UUID, owner: string, input: UpdateTagInput) {
  const [updated] = await db
    .update(promptTags)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.promptText !== undefined && { promptText: input.promptText }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.shortDescription !== undefined && { description: input.shortDescription }),
      updatedAt: new Date(),
    })
    .where(eq(promptTags.id, id))
    .returning();
  return updated;
}

export async function deletePromptTag(id: UUID, owner: string) {
  const [deleted] = await db.delete(promptTags).where(eq(promptTags.id, id)).returning();
  return !!deleted;
}

export async function createSessionTagBinding(ownerEmail: string, params: CreateBindingInput) {
  // Simplification: ignoring targetType/targetEntityId as they are not in schema
  const [binding] = await db
    .insert(sessionTags)
    .values({
      sessionId: params.sessionId as UUID,
      tagId: params.tagId as UUID,
      enabled: params.enabled ?? true,
    })
    .returning();
  return binding;
}

export async function getSessionTags(sessionId: UUID) {
  return await db.select().from(sessionTags).where(eq(sessionTags.sessionId, sessionId));
}

export async function getSessionTagsWithDefinitions(
  ownerEmail: string,
  sessionId: string,
  options: { enabledOnly?: boolean } = {}
) {
  const filters = [eq(sessionTags.sessionId, sessionId as UUID)];
  if (options.enabledOnly) {
    filters.push(eq(sessionTags.enabled, true));
  }

  const results = await db
    .select({
      binding: sessionTags,
      tag: promptTags,
    })
    .from(sessionTags)
    .innerJoin(promptTags, eq(sessionTags.tagId, promptTags.id))
    .where(and(...filters));

  return results.map((r) => ({
    ...r.binding,
    tag: r.tag,
  }));
}

export async function toggleSessionTagBinding(
  ownerEmail: string,
  bindingId: string,
  enabled: boolean
) {
  const [updated] = await db
    .update(sessionTags)
    .set({ enabled })
    .where(eq(sessionTags.id, bindingId as UUID))
    .returning();
  return updated;
}

export async function deleteSessionTagBinding(ownerEmail: string, bindingId: string) {
  const [deleted] = await db
    .delete(sessionTags)
    .where(eq(sessionTags.id, bindingId as UUID))
    .returning();
  return !!deleted;
}
