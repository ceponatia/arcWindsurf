import { randomUUID } from 'node:crypto';
import { pool } from './client.js';
import type {
  DbRow,
  MessageRole,
  QueryResult,
  RandomUUID,
  SessionMessage,
  SessionRecord,
  SessionSummaryRecord,
  UUID,
} from './types.js';

export type { MessageRole } from './types.js';
export type {
  SessionMessage as Message,
  SessionRecord as Session,
  SessionSummaryRecord as SessionSummary,
} from './types.js';

// Ensure typed UUID generator in environments without Node types
const genUUID: RandomUUID = randomUUID as unknown as RandomUUID;

type Message = SessionMessage;
type Session = SessionRecord;
type SessionSummary = SessionSummaryRecord;

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
  characterTemplateId: string,
  settingTemplateId: string
): Promise<Session> {
  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO user_sessions (id, character_template_id, setting_template_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET character_template_id = EXCLUDED.character_template_id, setting_template_id = EXCLUDED.setting_template_id, updated_at = now()
     RETURNING *`,
    [id, characterTemplateId, settingTemplateId]
  );
  const row = res.rows[0] as Record<string, unknown>;
  const createdAtIso = toIsoDate(row['created_at']);
  return {
    id,
    characterTemplateId,
    characterInstanceId: null,
    settingTemplateId,
    settingInstanceId: null,
    createdAt: createdAtIso,
    messages: [],
  };
}

export async function getSession(id: UUID): Promise<Session | undefined> {
  const sRes: QueryResult<DbRow> = await pool.query(
    `SELECT us.*,
            ci.id AS character_instance_id,
            si.id AS setting_instance_id
     FROM user_sessions us
     LEFT JOIN character_instances ci ON ci.session_id = us.id
     LEFT JOIN setting_instances si ON si.session_id = us.id
     WHERE us.id = $1
     LIMIT 1`,
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
      idx: Number(rec['idx'] ?? 0),
    };
  });
  return {
    id: readStr(base, 'id', id),
    characterTemplateId: readStr(base, 'character_template_id', ''),
    characterInstanceId: readStr(base, 'character_instance_id', '') || null,
    settingTemplateId: readStr(base, 'setting_template_id', ''),
    settingInstanceId: readStr(base, 'setting_instance_id', '') || null,
    createdAt,
    messages,
  };
}

export async function listSessions(): Promise<SessionSummary[]> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT us.*,
            ci.id AS character_instance_id,
            si.id AS setting_instance_id
     FROM user_sessions us
     LEFT JOIN character_instances ci ON ci.session_id = us.id
     LEFT JOIN setting_instances si ON si.session_id = us.id
     ORDER BY us.created_at DESC`
  );
  return res.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      id: readStr(rec, 'id', ''),
      characterTemplateId: readStr(rec, 'character_template_id', ''),
      characterInstanceId: readStr(rec, 'character_instance_id', '') || null,
      settingTemplateId: readStr(rec, 'setting_template_id', ''),
      settingInstanceId: readStr(rec, 'setting_instance_id', '') || null,
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
  await pool.query('TRUNCATE TABLE character_instances');
  await pool.query('TRUNCATE TABLE setting_instances');
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
