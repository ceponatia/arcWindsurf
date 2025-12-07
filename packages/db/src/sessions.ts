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
     LEFT JOIN LATERAL (
       SELECT id
       FROM character_instances
       WHERE session_id = us.id
       ORDER BY CASE WHEN role = 'primary' THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1
     ) ci ON TRUE
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
     LEFT JOIN LATERAL (
       SELECT id
       FROM character_instances
       WHERE session_id = us.id
       ORDER BY CASE WHEN role = 'primary' THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1
     ) ci ON TRUE
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
  await pool.query('TRUNCATE TABLE npc_messages');
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

export async function appendNpcMessage(
  sessionId: UUID,
  npcId: string,
  speaker: 'player' | 'npc' | 'narrator',
  content: string
): Promise<void> {
  const lastRes: QueryResult<DbRow> = await pool.query(
    'SELECT idx FROM npc_messages WHERE session_id = $1 AND npc_id = $2 ORDER BY idx DESC LIMIT 1',
    [sessionId, npcId]
  );
  const last = lastRes.rows[0] as Record<string, unknown> | undefined;
  const nextIdx = (Number(last?.['idx'] ?? 0) || 0) + 1;

  await pool.query(
    'INSERT INTO npc_messages (id, session_id, npc_id, idx, speaker, content) VALUES ($1, $2, $3, $4, $5, $6)',
    [genUUID(), sessionId, npcId, nextIdx, speaker, content]
  );
}

export interface NpcMessage {
  idx: number;
  speaker: 'player' | 'npc' | 'narrator';
  content: string;
  createdAt: string;
}

export async function getNpcMessages(
  sessionId: UUID,
  npcId: string,
  options: { limit?: number } = {}
): Promise<NpcMessage[]> {
  const limit = options.limit ?? 50;
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM npc_messages WHERE session_id = $1 AND npc_id = $2 ORDER BY idx ASC LIMIT $3',
    [sessionId, npcId, limit]
  );

  return res.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      idx: Number(rec['idx'] ?? 0),
      speaker: (rec['speaker'] as 'player' | 'npc' | 'narrator') ?? 'npc',
      content: readStr(rec, 'content', ''),
      createdAt: toIsoDate(rec['created_at']),
    };
  });
}

export interface StateChangeLogEntry {
  id: UUID;
  sessionId: UUID;
  turnIdx: number | null;
  patchCount: number;
  modifiedPaths: string[];
  agentTypes: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export async function appendStateChangeLog(params: {
  sessionId: UUID;
  turnIdx?: number | null;
  patchCount: number;
  modifiedPaths: string[];
  agentTypes: string[];
  metadata?: Record<string, unknown>;
}): Promise<StateChangeLogEntry> {
  const id = genUUID();
  const turnIdx = params.turnIdx ?? null;
  const { sessionId, patchCount, modifiedPaths, agentTypes, metadata } = params;

  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO state_change_log (id, session_id, turn_idx, patch_count, modified_paths, agent_types, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, sessionId, turnIdx, patchCount, modifiedPaths, agentTypes, metadata ?? null]
  );

  const row = res.rows[0] as Record<string, unknown>;
  const entry: StateChangeLogEntry = {
    id,
    sessionId,
    turnIdx,
    patchCount,
    modifiedPaths,
    agentTypes,
    createdAt: toIsoDate(row['created_at']),
  };

  if (metadata !== undefined) {
    entry.metadata = metadata;
  }

  return entry;
}

// ---------------------------------------------------------------------------
// Per-session state slices (location, inventory, time)
// ---------------------------------------------------------------------------

export type SessionSliceState = Record<string, unknown>;

function readJsonObject(obj: Record<string, unknown>, key: string): SessionSliceState | null {
  const v = obj[key];
  if (v && typeof v === 'object') return v as SessionSliceState;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (parsed && typeof parsed === 'object') return parsed as SessionSliceState;
    } catch {
      // fall through to null
    }
  }
  return null;
}

export async function getLocationState(sessionId: UUID): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_location_state WHERE session_id = $1 LIMIT 1',
    [sessionId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

export async function upsertLocationState(
  sessionId: UUID,
  state: SessionSliceState
): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_location_state (id, session_id, state_json)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (session_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()`,
    [genUUID(), sessionId, stateJson]
  );
}

export async function getInventoryState(sessionId: UUID): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_inventory_state WHERE session_id = $1 LIMIT 1',
    [sessionId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

export async function upsertInventoryState(
  sessionId: UUID,
  state: SessionSliceState
): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_inventory_state (id, session_id, state_json)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (session_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()`,
    [genUUID(), sessionId, stateJson]
  );
}

export async function getTimeState(sessionId: UUID): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_time_state WHERE session_id = $1 LIMIT 1',
    [sessionId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

export async function upsertTimeState(sessionId: UUID, state: SessionSliceState): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_time_state (id, session_id, state_json)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (session_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()`,
    [genUUID(), sessionId, stateJson]
  );
}
