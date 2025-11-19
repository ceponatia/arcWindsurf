import { randomUUID } from 'node:crypto';
import { pool } from './prisma.js';
import type { DbRow, QueryResult, UUID, RandomUUID } from './types.js';

// Ensure typed UUID generator in environments without Node types
const genUUID: RandomUUID = randomUUID as unknown as RandomUUID;

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Session {
  id: UUID;
  characterId: string;
  settingId: string;
  createdAt: string;
  messages: Message[];
}

export interface SessionSummary {
  id: UUID;
  characterId: string;
  settingId: string;
  createdAt: string;
}

function toIsoDate(v: unknown): string {
  if (v instanceof Date)
    return Number.isNaN(v.getTime()) ? new Date().toISOString() : v.toISOString();
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

function readStr(obj: Record<string, unknown>, key: string, fallback = ''): string {
  const v = obj[key];
  return typeof v === 'string' ? v : fallback;
}

export async function createSession(
  id: UUID,
  characterId: string,
  settingId: string
): Promise<Session> {
  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO user_sessions (id, character_id, setting_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET character_id = EXCLUDED.character_id, setting_id = EXCLUDED.setting_id, updated_at = now()
     RETURNING *`,
    [id, characterId, settingId]
  );
  const row = res.rows[0] as Record<string, unknown>;
  const createdAtIso = toIsoDate(row['created_at']);
  return {
    id,
    characterId,
    settingId,
    createdAt: createdAtIso,
    messages: [],
  };
}

export async function getSession(id: UUID): Promise<Session | undefined> {
  const sRes: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM user_sessions WHERE id = $1 LIMIT 1',
    [id]
  );
  if (sRes.rows.length === 0) return undefined;
  const base = sRes.rows[0] as Record<string, unknown>;
  const createdAt = toIsoDate(base['created_at']);
  const mRes: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM messages WHERE session_id = $1 ORDER BY idx ASC',
    [id]
  );
  const messages: Message[] = mRes.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    const created = toIsoDate(rec['created_at']);
    return {
      role: readStr(rec, 'role') as MessageRole,
      content: readStr(rec, 'content', ''),
      createdAt: created,
    };
  });
  return {
    id: readStr(base, 'id', id),
    characterId: readStr(base, 'character_id', ''),
    settingId: readStr(base, 'setting_id', ''),
    createdAt,
    messages,
  };
}

export async function listSessions(): Promise<SessionSummary[]> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM user_sessions ORDER BY created_at DESC'
  );
  return res.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      id: readStr(rec, 'id', ''),
      characterId: readStr(rec, 'character_id', ''),
      settingId: readStr(rec, 'setting_id', ''),
      createdAt: toIsoDate(rec['created_at']),
    };
  });
}

export async function deleteSession(id: UUID): Promise<void> {
  await pool.query('DELETE FROM messages WHERE session_id = $1', [id]);
  await pool.query('DELETE FROM user_sessions WHERE id = $1', [id]);
}

export async function clearSessions() {
  await pool.query('TRUNCATE TABLE messages');
  await pool.query('TRUNCATE TABLE user_sessions CASCADE');
}

export async function appendMessage(sessionId: UUID, role: MessageRole, content: string) {
  // Determine next idx for the session
  const lastRes: QueryResult<DbRow> = await pool.query(
    'SELECT idx FROM messages WHERE session_id = $1 ORDER BY idx DESC LIMIT 1',
    [sessionId]
  );
  const last = lastRes.rows[0] as Record<string, unknown> | undefined;
  const nextIdx = (Number(last?.['idx'] ?? 0) || 0) + 1;
  await pool.query(
    'INSERT INTO messages (id, session_id, idx, role, content) VALUES ($1, $2, $3, $4, $5)',
    [genUUID(), sessionId, nextIdx, role, content]
  );
}
