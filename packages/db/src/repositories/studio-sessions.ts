import { eq, lt } from 'drizzle-orm';
import { drizzle as db } from '../connection/index.js';
import { studioSessions } from '../schema/index.js';

export interface StudioSession {
  id: string;
  profileSnapshot: Record<string, unknown>;
  conversation: Array<{ role: string; content: string; timestamp: string }>;
  summary: string | null;
  inferredTraits: Array<{ path: string; value: unknown; confidence: number }>;
  exploredTopics: string[];
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Initialize the studio_sessions table.
 * Note: Table is defined in schema/index.ts and should be managed by migrations.
 * This function is kept for API compatibility with the task but uses raw SQL for IF NOT EXISTS.
 */
export async function initStudioSessionsTable(): Promise<void> {
  try {
    const { pool } = await import('../utils/client.js');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS studio_sessions (
        id TEXT PRIMARY KEY,
        profile_snapshot JSONB NOT NULL,
        conversation JSONB NOT NULL DEFAULT '[]',
        summary TEXT,
        inferred_traits JSONB NOT NULL DEFAULT '[]',
        explored_topics JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_studio_sessions_expires_at ON studio_sessions(expires_at)
    `);
  } catch (err) {
    console.warn('Failed to manually init studio_sessions table', err);
  }
}

/**
 * Create a new studio session.
 */
export async function createStudioSession(
  id: string,
  profileSnapshot: Record<string, unknown>
): Promise<StudioSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

  const [row] = await db
    .insert(studioSessions)
    .values({
      id,
      profileSnapshot,
      conversation: [],
      summary: null,
      inferredTraits: [],
      exploredTopics: [],
      createdAt: now,
      lastActiveAt: now,
      expiresAt: expiresAt,
    })
    .returning();

  if (!row) throw new Error('Failed to create studio session');

  return row as unknown as StudioSession;
}

/**
 * Get a studio session by ID.
 */
export async function getStudioSession(id: string): Promise<StudioSession | null> {
  const [row] = await db
    .select()
    .from(studioSessions)
    .where(eq(studioSessions.id, id))
    .limit(1);

  return (row as unknown as StudioSession) || null;
}

/**
 * Update a studio session.
 */
export async function updateStudioSession(
  id: string,
  updates: Partial<{
    profileSnapshot: Record<string, unknown>;
    conversation: Array<{ role: string; content: string; timestamp: string }>;
    summary: string | null;
    inferredTraits: Array<{ path: string; value: unknown; confidence: number }>;
    exploredTopics: string[];
  }>
): Promise<StudioSession | null> {
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

  await db
    .update(studioSessions)
    .set({
      ...updates,
      lastActiveAt: now,
      expiresAt: newExpiresAt,
    })
    .where(eq(studioSessions.id, id));

  return getStudioSession(id);
}

/**
 * Delete a studio session.
 */
export async function deleteStudioSession(id: string): Promise<boolean> {
  const result = await db
    .delete(studioSessions)
    .where(eq(studioSessions.id, id))
    .returning({ id: studioSessions.id });
  return result.length > 0;
}

/**
 * Delete all expired sessions (TTL cleanup).
 * Call this periodically (e.g., on server startup, or via cron).
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();
  const result = await db
    .delete(studioSessions)
    .where(lt(studioSessions.expiresAt, now))
    .returning({ id: studioSessions.id });
  return result.length;
}
