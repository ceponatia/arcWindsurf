# TASK-001: Database Schema for Studio Sessions

**Priority**: P0 (Blocking)
**Phase**: 1 - Core Actor
**Estimate**: 30 minutes
**Depends On**: None

---

## Objective

Create a database table to persist character studio conversation sessions with automatic 24-hour TTL cleanup.

## File to Create

`packages/db/src/studio-sessions.ts`

## Database Schema

Create a new table `studio_sessions` with the following columns:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `TEXT` | PRIMARY KEY | Session UUID |
| `profile_snapshot` | `TEXT` | NOT NULL | JSON-serialized CharacterProfile |
| `conversation` | `TEXT` | NOT NULL, DEFAULT '[]' | JSON array of ConversationMessage |
| `summary` | `TEXT` | NULL | Summarized older conversation |
| `inferred_traits` | `TEXT` | NOT NULL, DEFAULT '[]' | JSON array of InferredTrait |
| `explored_topics` | `TEXT` | NOT NULL, DEFAULT '[]' | JSON array of DiscoveryTopic strings |
| `created_at` | `INTEGER` | NOT NULL | Unix timestamp |
| `last_active_at` | `INTEGER` | NOT NULL | Unix timestamp |
| `expires_at` | `INTEGER` | NOT NULL | Unix timestamp (created_at + 24 hours) |

## Implementation

### Step 1: Create the schema file

```typescript
// packages/db/src/studio-sessions.ts
import { db } from './client.js';

export interface StudioSessionRow {
  id: string;
  profile_snapshot: string;
  conversation: string;
  summary: string | null;
  inferred_traits: string;
  explored_topics: string;
  created_at: number;
  last_active_at: number;
  expires_at: number;
}

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
 */
export function initStudioSessionsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS studio_sessions (
      id TEXT PRIMARY KEY,
      profile_snapshot TEXT NOT NULL,
      conversation TEXT NOT NULL DEFAULT '[]',
      summary TEXT,
      inferred_traits TEXT NOT NULL DEFAULT '[]',
      explored_topics TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  // Create index for TTL cleanup queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_studio_sessions_expires_at
    ON studio_sessions(expires_at)
  `);
}

/**
 * Create a new studio session.
 */
export function createStudioSession(
  id: string,
  profileSnapshot: Record<string, unknown>
): StudioSession {
  const now = Date.now();
  const expiresAt = now + TWENTY_FOUR_HOURS_MS;

  const stmt = db.prepare(`
    INSERT INTO studio_sessions
    (id, profile_snapshot, conversation, summary, inferred_traits, explored_topics, created_at, last_active_at, expires_at)
    VALUES (?, ?, '[]', NULL, '[]', '[]', ?, ?, ?)
  `);

  stmt.run(id, JSON.stringify(profileSnapshot), now, now, expiresAt);

  return {
    id,
    profileSnapshot,
    conversation: [],
    summary: null,
    inferredTraits: [],
    exploredTopics: [],
    createdAt: new Date(now),
    lastActiveAt: new Date(now),
    expiresAt: new Date(expiresAt),
  };
}

/**
 * Get a studio session by ID.
 */
export function getStudioSession(id: string): StudioSession | null {
  const stmt = db.prepare(`SELECT * FROM studio_sessions WHERE id = ?`);
  const row = stmt.get(id) as StudioSessionRow | undefined;

  if (!row) return null;

  return rowToSession(row);
}

/**
 * Update a studio session.
 */
export function updateStudioSession(
  id: string,
  updates: Partial<{
    profileSnapshot: Record<string, unknown>;
    conversation: Array<{ role: string; content: string; timestamp: string }>;
    summary: string | null;
    inferredTraits: Array<{ path: string; value: unknown; confidence: number }>;
    exploredTopics: string[];
  }>
): StudioSession | null {
  const session = getStudioSession(id);
  if (!session) return null;

  const now = Date.now();
  const newExpiresAt = now + TWENTY_FOUR_HOURS_MS;

  const stmt = db.prepare(`
    UPDATE studio_sessions SET
      profile_snapshot = ?,
      conversation = ?,
      summary = ?,
      inferred_traits = ?,
      explored_topics = ?,
      last_active_at = ?,
      expires_at = ?
    WHERE id = ?
  `);

  const newProfileSnapshot = updates.profileSnapshot ?? session.profileSnapshot;
  const newConversation = updates.conversation ?? session.conversation;
  const newSummary = updates.summary !== undefined ? updates.summary : session.summary;
  const newInferredTraits = updates.inferredTraits ?? session.inferredTraits;
  const newExploredTopics = updates.exploredTopics ?? session.exploredTopics;

  stmt.run(
    JSON.stringify(newProfileSnapshot),
    JSON.stringify(newConversation),
    newSummary,
    JSON.stringify(newInferredTraits),
    JSON.stringify(newExploredTopics),
    now,
    newExpiresAt,
    id
  );

  return getStudioSession(id);
}

/**
 * Delete a studio session.
 */
export function deleteStudioSession(id: string): boolean {
  const stmt = db.prepare(`DELETE FROM studio_sessions WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Delete all expired sessions (TTL cleanup).
 * Call this periodically (e.g., on server startup, or via cron).
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  const stmt = db.prepare(`DELETE FROM studio_sessions WHERE expires_at < ?`);
  const result = stmt.run(now);
  return result.changes;
}

/**
 * Convert database row to StudioSession object.
 */
function rowToSession(row: StudioSessionRow): StudioSession {
  return {
    id: row.id,
    profileSnapshot: JSON.parse(row.profile_snapshot) as Record<string, unknown>,
    conversation: JSON.parse(row.conversation) as Array<{ role: string; content: string; timestamp: string }>,
    summary: row.summary,
    inferredTraits: JSON.parse(row.inferred_traits) as Array<{ path: string; value: unknown; confidence: number }>,
    exploredTopics: JSON.parse(row.explored_topics) as string[],
    createdAt: new Date(row.created_at),
    lastActiveAt: new Date(row.last_active_at),
    expiresAt: new Date(row.expires_at),
  };
}
```

### Step 2: Export from package index

Add to `packages/db/src/index.ts`:

```typescript
export {
  initStudioSessionsTable,
  createStudioSession,
  getStudioSession,
  updateStudioSession,
  deleteStudioSession,
  cleanupExpiredSessions,
  type StudioSession,
} from './studio-sessions.js';
```

### Step 3: Initialize table on startup

In the API server initialization (likely `packages/api/src/server.ts` or similar), call:

```typescript
import { initStudioSessionsTable, cleanupExpiredSessions } from '@minimal-rpg/db';

// During startup
initStudioSessionsTable();
cleanupExpiredSessions(); // Clean up any stale sessions from before restart
```

## Testing

Create test file `packages/db/src/__tests__/studio-sessions.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  initStudioSessionsTable,
  createStudioSession,
  getStudioSession,
  updateStudioSession,
  deleteStudioSession,
  cleanupExpiredSessions,
} from '../studio-sessions.js';

describe('studio-sessions', () => {
  beforeEach(() => {
    initStudioSessionsTable();
  });

  it('creates and retrieves a session', () => {
    const session = createStudioSession('test-1', { name: 'Test Character' });
    expect(session.id).toBe('test-1');
    expect(session.profileSnapshot.name).toBe('Test Character');

    const retrieved = getStudioSession('test-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('test-1');
  });

  it('updates a session', () => {
    createStudioSession('test-2', { name: 'Test' });
    const updated = updateStudioSession('test-2', {
      conversation: [{ role: 'user', content: 'Hello', timestamp: new Date().toISOString() }],
    });
    expect(updated?.conversation.length).toBe(1);
  });

  it('deletes a session', () => {
    createStudioSession('test-3', { name: 'Test' });
    const deleted = deleteStudioSession('test-3');
    expect(deleted).toBe(true);
    expect(getStudioSession('test-3')).toBeNull();
  });
});
```

## Acceptance Criteria

- [ ] `studio_sessions` table created with all columns
- [ ] Index on `expires_at` for efficient TTL queries
- [ ] `createStudioSession()` creates session with 24-hour expiry
- [ ] `getStudioSession()` retrieves and deserializes JSON fields
- [ ] `updateStudioSession()` updates fields and extends TTL
- [ ] `deleteStudioSession()` removes session
- [ ] `cleanupExpiredSessions()` removes expired sessions
- [ ] Table initialized on API server startup
- [ ] All functions exported from `@minimal-rpg/db`
- [ ] Unit tests pass
