import { desc, eq, lt } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { workspaceDrafts } from '../schema/index.js';
import type { UUID } from '../types.js';
import type { WorkspaceDraftRecord } from './types.js';

export interface ListWorkspaceDraftsOptions {
  limit?: number;
}

export async function listWorkspaceDrafts(
  userId: string,
  options: ListWorkspaceDraftsOptions = {}
): Promise<WorkspaceDraftRecord[]> {
  const limit = options.limit ?? 20;
  const rows = await db
    .select()
    .from(workspaceDrafts)
    .where(eq(workspaceDrafts.userId, userId))
    .orderBy(desc(workspaceDrafts.updatedAt))
    .limit(limit);

  return rows as unknown as WorkspaceDraftRecord[];
}

export async function getWorkspaceDraft(id: UUID): Promise<WorkspaceDraftRecord | null> {
  const rows = await db.select().from(workspaceDrafts).where(eq(workspaceDrafts.id, id)).limit(1);
  return (rows[0] as unknown as WorkspaceDraftRecord | undefined) ?? null;
}

export async function createWorkspaceDraft(params: {
  userId: string;
  name?: string;
  workspaceState?: Record<string, unknown>;
  currentStep?: string;
}): Promise<WorkspaceDraftRecord> {
  const now = new Date();
  const rows = await db
    .insert(workspaceDrafts)
    .values({
      userId: params.userId,
      name: params.name ?? null,
      workspaceState: params.workspaceState ?? {},
      currentStep: params.currentStep ?? 'setting',
      updatedAt: now,
    })
    .returning();

  const draft = rows[0] as unknown as WorkspaceDraftRecord | undefined;
  if (!draft) throw new Error('failed to create workspace draft');
  return draft;
}

export async function updateWorkspaceDraft(
  id: UUID,
  updates: {
    name?: string | null;
    workspaceState?: Record<string, unknown>;
    currentStep?: string;
    validationState?: Record<string, unknown>;
  }
): Promise<WorkspaceDraftRecord | null> {
  const now = new Date();
  const rows = await db
    .update(workspaceDrafts)
    .set({
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.workspaceState !== undefined ? { workspaceState: updates.workspaceState } : {}),
      ...(updates.currentStep !== undefined ? { currentStep: updates.currentStep } : {}),
      ...(updates.validationState !== undefined
        ? { validationState: updates.validationState }
        : {}),
      updatedAt: now,
    })
    .where(eq(workspaceDrafts.id, id))
    .returning();

  return (rows[0] as unknown as WorkspaceDraftRecord | undefined) ?? null;
}

export async function deleteWorkspaceDraft(id: UUID): Promise<boolean> {
  const rows = await db.delete(workspaceDrafts).where(eq(workspaceDrafts.id, id)).returning();
  return rows.length > 0;
}

export async function pruneOldWorkspaceDrafts(olderThanDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .delete(workspaceDrafts)
    .where(lt(workspaceDrafts.updatedAt, cutoff))
    .returning();
  return rows.length;
}
