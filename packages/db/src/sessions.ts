import { randomUUID } from 'node:crypto';
import { pool } from './client.js';
import type {
  DbRow,
  MessageRole,
  MessageSpeaker,
  OwnerEmail,
  QueryResult,
  RandomUUID,
  SessionMessage,
  SessionRecord,
  SessionSummaryRecord,
  UUID,
} from './types.js';

export type { MessageSpeaker } from './types.js';

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

export interface SessionHistoryEntry {
  id: UUID;
  sessionId: UUID;
  turnIdx: number;
  ownerUserId: string | null;
  playerInput: string;
  context: Record<string, unknown> | null;
  debug: Record<string, unknown> | null;
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

function readJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

function readStrArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v)))
      .filter((v) => v.length > 0);
  }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v)))
          .filter((v) => v.length > 0);
      }
    } catch {
      // ignore parse errors
    }
  }

  return [];
}

export async function createSession(
  ownerEmail: OwnerEmail,
  id: UUID,
  characterTemplateId: string,
  settingTemplateId: string
): Promise<Session> {
  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO user_sessions (id, owner_email, character_template_id, setting_template_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       character_template_id = EXCLUDED.character_template_id,
       setting_template_id = EXCLUDED.setting_template_id,
       updated_at = now()
     WHERE user_sessions.owner_email = EXCLUDED.owner_email
     RETURNING *`,
    [id, ownerEmail, characterTemplateId, settingTemplateId]
  );
  if (res.rows.length === 0) {
    throw new Error('Failed to create session');
  }
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

export async function getSession(ownerEmail: OwnerEmail, id: UUID): Promise<Session | undefined> {
  const sRes: QueryResult<DbRow> = await pool.query(
    `SELECT us.*,
            ci.id AS character_instance_id,
            si.id AS setting_instance_id
     FROM user_sessions us
     LEFT JOIN LATERAL (
       SELECT id
       FROM character_instances
       WHERE session_id = us.id AND owner_email = us.owner_email
       ORDER BY CASE WHEN role = 'primary' THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1
     ) ci ON TRUE
     LEFT JOIN setting_instances si ON si.session_id = us.id AND si.owner_email = us.owner_email
     WHERE us.id = $1 AND us.owner_email = $2
     LIMIT 1`,
    [id, ownerEmail]
  );
  if (sRes.rows.length === 0) return undefined;
  const base = sRes.rows[0] as Record<string, unknown>;
  const createdAt = toIsoDate(base['created_at']);
  const mRes: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM messages WHERE session_id = $1 AND owner_email = $2 ORDER BY idx ASC',
    [id, ownerEmail]
  );
  const messages: Message[] = mRes.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    const created = toIsoDate(rec['created_at']);
    const speakerId = readStr(rec, 'speaker_id', '');
    const speakerName = readStr(rec, 'speaker_name', '');
    const speakerProfilePic = readStr(rec, 'speaker_profile_pic', '');

    const message: Message = {
      role: readStr(rec, 'role') as MessageRole,
      content: readStr(rec, 'content', ''),
      createdAt: created,
      idx: Number(rec['idx'] ?? 0),
    };

    // Attach speaker metadata if present (assistant messages from NPCs)
    if (speakerId && speakerName) {
      message.speaker = {
        id: speakerId,
        name: speakerName,
        ...(speakerProfilePic ? { profilePic: speakerProfilePic } : {}),
      };
    }

    return message;
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

export async function listSessions(ownerEmail: OwnerEmail): Promise<SessionSummary[]> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT us.*,
            ci.id AS character_instance_id,
            si.id AS setting_instance_id
     FROM user_sessions us
     LEFT JOIN LATERAL (
       SELECT id
       FROM character_instances
       WHERE session_id = us.id AND owner_email = us.owner_email
       ORDER BY CASE WHEN role = 'primary' THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1
     ) ci ON TRUE
     LEFT JOIN setting_instances si ON si.session_id = us.id AND si.owner_email = us.owner_email
     WHERE us.owner_email = $1
     ORDER BY us.created_at DESC`,
    [ownerEmail]
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

export async function deleteSession(ownerEmail: OwnerEmail, id: UUID): Promise<void> {
  await pool.query('DELETE FROM user_sessions WHERE id = $1 AND owner_email = $2', [
    id,
    ownerEmail,
  ]);
}

export async function clearSessions() {
  await pool.query('TRUNCATE TABLE messages');
  await pool.query('TRUNCATE TABLE npc_messages');
  await pool.query('TRUNCATE TABLE character_instances');
  await pool.query('TRUNCATE TABLE setting_instances');
  await pool.query('TRUNCATE TABLE user_sessions CASCADE');
}

export async function appendMessage(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  role: MessageRole,
  content: string,
  speaker?: MessageSpeaker
) {
  // Determine next idx for the session
  const lastRes: QueryResult<DbRow> = await pool.query(
    'SELECT idx FROM messages WHERE session_id = $1 AND owner_email = $2 ORDER BY idx DESC LIMIT 1',
    [sessionId, ownerEmail]
  );
  const last = lastRes.rows[0] as Record<string, unknown> | undefined;
  const nextIdx = (Number(last?.['idx'] ?? 0) || 0) + 1;

  if (speaker?.id && speaker.name) {
    // Insert with speaker metadata for assistant messages
    await pool.query(
      'INSERT INTO messages (id, owner_email, session_id, idx, role, content, speaker_id, speaker_name, speaker_profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [
        genUUID(),
        ownerEmail,
        sessionId,
        nextIdx,
        role,
        content,
        speaker.id,
        speaker.name,
        speaker.profilePic ?? null,
      ]
    );
  } else {
    // Insert without speaker metadata (user messages)
    await pool.query(
      'INSERT INTO messages (id, owner_email, session_id, idx, role, content) VALUES ($1, $2, $3, $4, $5, $6)',
      [genUUID(), ownerEmail, sessionId, nextIdx, role, content]
    );
  }
}

export async function appendNpcMessage(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  speaker: 'player' | 'npc' | 'narrator',
  content: string,
  options: { witnessedBy?: string[] } = {}
): Promise<void> {
  const lastRes: QueryResult<DbRow> = await pool.query(
    'SELECT idx FROM npc_messages WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3 ORDER BY idx DESC LIMIT 1',
    [sessionId, ownerEmail, npcId]
  );
  const last = lastRes.rows[0] as Record<string, unknown> | undefined;
  const nextIdx = (Number(last?.['idx'] ?? 0) || 0) + 1;

  const witnessedBy = options.witnessedBy ?? [];

  await pool.query(
    'INSERT INTO npc_messages (id, owner_email, session_id, npc_id, idx, speaker, content, witnessed_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [genUUID(), ownerEmail, sessionId, npcId, nextIdx, speaker, content, witnessedBy]
  );
}

export interface NpcMessage {
  idx: number;
  speaker: 'player' | 'npc' | 'narrator';
  content: string;
  createdAt: string;
  witnessedBy?: string[];
}

export async function getNpcMessages(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  options: { limit?: number } = {}
): Promise<NpcMessage[]> {
  const limit = options.limit ?? 50;
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM npc_messages WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3 ORDER BY idx ASC LIMIT $4',
    [sessionId, ownerEmail, npcId, limit]
  );

  return res.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      idx: Number(rec['idx'] ?? 0),
      speaker: (rec['speaker'] as 'player' | 'npc' | 'narrator') ?? 'npc',
      content: readStr(rec, 'content', ''),
      createdAt: toIsoDate(rec['created_at']),
      witnessedBy: readStrArray(rec['witnessed_by']),
    };
  });
}

export async function getNpcOwnHistory(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  options: { limit?: number } = {}
): Promise<NpcMessage[]> {
  const limit = options.limit ?? 50;
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM npc_messages
     WHERE owner_email = $1
       AND session_id = $2
       AND (npc_id = $3 OR $3 = ANY(witnessed_by))
     ORDER BY idx DESC
     LIMIT $4`,
    [ownerEmail, sessionId, npcId, limit]
  );

  const messages = res.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      idx: Number(rec['idx'] ?? 0),
      speaker: (rec['speaker'] as 'player' | 'npc' | 'narrator') ?? 'npc',
      content: readStr(rec, 'content', ''),
      createdAt: toIsoDate(rec['created_at']),
      witnessedBy: readStrArray(rec['witnessed_by']),
    };
  });

  return messages.reverse();
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
  ownerEmail: OwnerEmail;
  sessionId: UUID;
  turnIdx?: number | null;
  patchCount: number;
  modifiedPaths: string[];
  agentTypes: string[];
  metadata?: Record<string, unknown>;
}): Promise<StateChangeLogEntry> {
  const id = genUUID();
  const turnIdx = params.turnIdx ?? null;
  const { ownerEmail, sessionId, patchCount, modifiedPaths, agentTypes, metadata } = params;

  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO state_change_log (id, owner_email, session_id, turn_idx, patch_count, modified_paths, agent_types, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, ownerEmail, sessionId, turnIdx, patchCount, modifiedPaths, agentTypes, metadata ?? null]
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
// Session history with debug context
// ---------------------------------------------------------------------------

export async function appendSessionHistoryEntry(params: {
  ownerEmail: OwnerEmail;
  sessionId: UUID;
  turnIdx: number;
  playerInput: string;
  ownerUserId?: string | null;
  context?: Record<string, unknown> | null;
  debug?: Record<string, unknown> | null;
}): Promise<SessionHistoryEntry> {
  const id = genUUID();
  const ownerUserId = params.ownerUserId ?? null;
  const contextJson = params.context ? JSON.stringify(params.context) : null;
  const debugJson = params.debug ? JSON.stringify(params.debug) : null;

  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO session_history (id, owner_email, session_id, turn_idx, owner_user_id, player_input, context_json, debug_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
     ON CONFLICT (session_id, turn_idx) DO UPDATE SET
       owner_email = EXCLUDED.owner_email,
       owner_user_id = EXCLUDED.owner_user_id,
       player_input = EXCLUDED.player_input,
       context_json = COALESCE(EXCLUDED.context_json, session_history.context_json),
       debug_json = COALESCE(EXCLUDED.debug_json, session_history.debug_json)
     WHERE session_history.owner_email = EXCLUDED.owner_email
     RETURNING *`,
    [
      id,
      params.ownerEmail,
      params.sessionId,
      params.turnIdx,
      ownerUserId,
      params.playerInput,
      contextJson,
      debugJson,
    ]
  );

  const row = res.rows[0] as Record<string, unknown>;

  return {
    id: readStr(row, 'id', id),
    sessionId: readStr(row, 'session_id', params.sessionId),
    turnIdx: Number(row['turn_idx'] ?? params.turnIdx),
    ownerUserId: readStr(row, 'owner_user_id', '') || null,
    playerInput: readStr(row, 'player_input', params.playerInput),
    context: readJsonRecord(row['context_json']),
    debug: readJsonRecord(row['debug_json']),
    createdAt: toIsoDate(row['created_at']),
  };
}

export async function getSessionHistory(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  options: { limit?: number } = {}
): Promise<SessionHistoryEntry[]> {
  const limit = options.limit ?? 50;
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_history
     WHERE session_id = $1 AND owner_email = $2
     ORDER BY turn_idx DESC, created_at DESC
     LIMIT $3`,
    [sessionId, ownerEmail, limit]
  );

  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: readStr(row, 'id'),
      sessionId: readStr(row, 'session_id'),
      turnIdx: Number(row['turn_idx'] ?? 0),
      ownerUserId: readStr(row, 'owner_user_id', '') || null,
      playerInput: readStr(row, 'player_input'),
      context: readJsonRecord(row['context_json']),
      debug: readJsonRecord(row['debug_json']),
      createdAt: toIsoDate(row['created_at']),
    };
  });
}

/**
 * Admin-only: returns session history without owner scoping.
 * Callers must enforce admin access before using this.
 */
export async function getSessionHistoryAdmin(
  sessionId: UUID,
  options: { limit?: number } = {}
): Promise<SessionHistoryEntry[]> {
  const limit = options.limit ?? 50;
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_history
     WHERE session_id = $1
     ORDER BY turn_idx DESC, created_at DESC
     LIMIT $2`,
    [sessionId, limit]
  );

  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: readStr(row, 'id'),
      sessionId: readStr(row, 'session_id'),
      turnIdx: Number(row['turn_idx'] ?? 0),
      ownerUserId: readStr(row, 'owner_user_id', '') || null,
      playerInput: readStr(row, 'player_input'),
      context: readJsonRecord(row['context_json']),
      debug: readJsonRecord(row['debug_json']),
      createdAt: toIsoDate(row['created_at']),
    };
  });
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

export async function getLocationState(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_location_state WHERE session_id = $1 AND owner_email = $2 LIMIT 1',
    [sessionId, ownerEmail]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

export async function upsertLocationState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  state: SessionSliceState
): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_location_state (id, owner_email, session_id, state_json)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (session_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()
     WHERE session_location_state.owner_email = EXCLUDED.owner_email`,
    [genUUID(), ownerEmail, sessionId, stateJson]
  );
}

export async function getInventoryState(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_inventory_state WHERE session_id = $1 AND owner_email = $2 LIMIT 1',
    [sessionId, ownerEmail]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

export async function upsertInventoryState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  state: SessionSliceState
): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_inventory_state (id, owner_email, session_id, state_json)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (session_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()
     WHERE session_inventory_state.owner_email = EXCLUDED.owner_email`,
    [genUUID(), ownerEmail, sessionId, stateJson]
  );
}

export async function getTimeState(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_time_state WHERE session_id = $1 AND owner_email = $2 LIMIT 1',
    [sessionId, ownerEmail]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

export async function upsertTimeState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  state: SessionSliceState
): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_time_state (id, owner_email, session_id, state_json)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (session_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()
     WHERE session_time_state.owner_email = EXCLUDED.owner_email`,
    [genUUID(), ownerEmail, sessionId, stateJson]
  );
}

// ============================================================================
// Scene Actions
// ============================================================================

export interface SceneAction {
  id: UUID;
  sessionId: UUID;
  actorId: string;
  actorType: 'player' | 'npc';
  actionType: 'speech' | 'action' | 'thought' | 'observation' | 'other';
  content: string;
  observableBy: string[];
  locationId: string | null;
  createdAt: string;
  turnNumber: number | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateSceneActionInput {
  ownerEmail: OwnerEmail;
  sessionId: UUID;
  actorId: string;
  actorType: 'player' | 'npc';
  actionType: 'speech' | 'action' | 'thought' | 'observation' | 'other';
  content: string;
  observableBy: string[];
  locationId?: string | null;
  turnNumber?: number | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Create a new scene action.
 */
export async function createSceneAction(input: CreateSceneActionInput): Promise<SceneAction> {
  const id = genUUID();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO scene_actions (
      id, owner_email, session_id, actor_id, actor_type, action_type,
      content, observable_by, location_id, turn_number, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
    RETURNING *`,
    [
      id,
      input.ownerEmail,
      input.sessionId,
      input.actorId,
      input.actorType,
      input.actionType,
      input.content,
      input.observableBy,
      input.locationId ?? null,
      input.turnNumber ?? null,
      metadataJson,
    ]
  );

  const row = res.rows[0] as Record<string, unknown>;
  return sceneActionFromRow(row);
}

/**
 * Get scene actions for a session, optionally filtered by location or turn.
 */
export async function getSceneActions(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  options?: {
    locationId?: string;
    turnNumber?: number;
    limit?: number;
    orderBy?: 'asc' | 'desc';
  }
): Promise<SceneAction[]> {
  const params: unknown[] = [sessionId, ownerEmail];
  const conditions: string[] = ['session_id = $1', 'owner_email = $2'];
  let paramCount = 2;

  if (options?.locationId) {
    paramCount++;
    conditions.push(`location_id = $${paramCount}`);
    params.push(options.locationId);
  }

  if (options?.turnNumber !== undefined) {
    paramCount++;
    conditions.push(`turn_number = $${paramCount}`);
    params.push(options.turnNumber);
  }

  const orderDir = options?.orderBy === 'asc' ? 'ASC' : 'DESC';
  const limitClause = options?.limit ? `LIMIT ${options.limit}` : '';

  const query = `
    SELECT *
    FROM scene_actions
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at ${orderDir}
    ${limitClause}
  `;

  const res: QueryResult<DbRow> = await pool.query(query, params);
  return res.rows.map((row) => sceneActionFromRow(row as Record<string, unknown>));
}

/**
 * Get recent scene actions (most recent N actions).
 */
export async function getRecentSceneActions(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  limit = 20
): Promise<SceneAction[]> {
  return getSceneActions(ownerEmail, sessionId, { limit, orderBy: 'desc' });
}

/**
 * Delete scene actions older than a certain number of turns to keep the table manageable.
 */
export async function pruneOldSceneActions(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  keepRecentTurns = 10
): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    `DELETE FROM scene_actions
     WHERE session_id = $1 AND owner_email = $2
       AND turn_number IS NOT NULL
       AND turn_number < (
         SELECT MAX(turn_number) - $3
         FROM scene_actions
         WHERE session_id = $1 AND owner_email = $2
       )`,
    [sessionId, ownerEmail, keepRecentTurns]
  );

  return res.rowCount ?? 0;
}

/**
 * Delete all scene actions for a session.
 */
export async function deleteSceneActions(ownerEmail: OwnerEmail, sessionId: UUID): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM scene_actions WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );

  return res.rowCount ?? 0;
}

/**
 * Helper to convert a database row to a SceneAction object.
 */
function sceneActionFromRow(row: Record<string, unknown>): SceneAction {
  return {
    id: readStr(row, 'id', ''),
    sessionId: readStr(row, 'session_id', ''),
    actorId: readStr(row, 'actor_id', ''),
    actorType: readStr(row, 'actor_type', 'other') as 'player' | 'npc',
    actionType: readStr(row, 'action_type', 'other') as
      | 'speech'
      | 'action'
      | 'thought'
      | 'observation'
      | 'other',
    content: readStr(row, 'content', ''),
    observableBy: Array.isArray(row['observable_by']) ? (row['observable_by'] as string[]) : [],
    locationId: readStr(row, 'location_id', '') || null,
    createdAt: toIsoDate(row['created_at']),
    turnNumber: typeof row['turn_number'] === 'number' ? row['turn_number'] : null,
    metadata: readJsonRecord(row['metadata']),
  };
}

// ============================================================================
// Affinity State (NPC Relationships)
// ============================================================================

/**
 * NPC affinity state record.
 * Stores relationship scores, action history, milestones, etc.
 */
export interface AffinityStateRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  stateJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get affinity state for a specific NPC in a session.
 */
export async function getAffinityState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_affinity_state WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3 LIMIT 1',
    [sessionId, ownerEmail, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

/**
 * Get all affinity states for a session (all NPCs).
 */
export async function getAllAffinityStates(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<Map<string, SessionSliceState>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT npc_id, state_json FROM session_affinity_state WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );

  const result = new Map<string, SessionSliceState>();
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    const npcId = readStr(rec, 'npc_id');
    const state = readJsonObject(rec, 'state_json');
    if (npcId && state) {
      result.set(npcId, state);
    }
  }
  return result;
}

/**
 * Upsert affinity state for a specific NPC in a session.
 */
export async function upsertAffinityState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  state: SessionSliceState
): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_affinity_state (id, owner_email, session_id, npc_id, state_json)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()
     WHERE session_affinity_state.owner_email = EXCLUDED.owner_email`,
    [genUUID(), ownerEmail, sessionId, npcId, stateJson]
  );
}

/**
 * Delete affinity state for a specific NPC in a session.
 */
export async function deleteAffinityState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<void> {
  await pool.query(
    'DELETE FROM session_affinity_state WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3',
    [sessionId, ownerEmail, npcId]
  );
}

/**
 * Delete all affinity states for a session.
 */
export async function deleteAllAffinityStates(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_affinity_state WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );
  return res.rowCount ?? 0;
}

// ============================================================================
// NPC Location State
// ============================================================================

/**
 * NPC location state record.
 * Stores where an NPC is, what they're doing, and when they arrived.
 */
export interface NpcLocationStateRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  locationId: string;
  subLocationId: string | null;
  activityJson: Record<string, unknown>;
  arrivedAtJson: Record<string, unknown>;
  interruptible: boolean;
  scheduleSlotId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get NPC location state for a specific NPC in a session.
 */
export async function getNpcLocationState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<NpcLocationStateRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_npc_location_state 
     WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3 
     LIMIT 1`,
    [sessionId, ownerEmail, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return npcLocationStateFromRow(row);
}

/**
 * Get all NPC location states for a session.
 */
export async function getAllNpcLocationStates(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<Map<string, NpcLocationStateRecord>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_npc_location_state WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );

  const result = new Map<string, NpcLocationStateRecord>();
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    const state = npcLocationStateFromRow(rec);
    if (state) {
      result.set(state.npcId, state);
    }
  }
  return result;
}

/**
 * Get all NPCs at a specific location.
 */
export async function getNpcsAtLocation(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  locationId: string
): Promise<NpcLocationStateRecord[]> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_npc_location_state 
     WHERE session_id = $1 AND owner_email = $2 AND location_id = $3`,
    [sessionId, ownerEmail, locationId]
  );

  return res.rows.map((row) => npcLocationStateFromRow(row as Record<string, unknown>)!);
}

/**
 * Upsert NPC location state for a specific NPC in a session.
 */
export async function upsertNpcLocationState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  state: {
    locationId: string;
    subLocationId?: string | null;
    activityJson: Record<string, unknown>;
    arrivedAtJson: Record<string, unknown>;
    interruptible?: boolean;
    scheduleSlotId?: string | null;
  }
): Promise<void> {
  const activityStr = JSON.stringify(state.activityJson ?? {});
  const arrivedAtStr = JSON.stringify(state.arrivedAtJson ?? {});

  await pool.query(
    `INSERT INTO session_npc_location_state 
       (id, owner_email, session_id, npc_id, location_id, sub_location_id, activity_json, arrived_at_json, interruptible, schedule_slot_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       location_id = EXCLUDED.location_id,
       sub_location_id = EXCLUDED.sub_location_id,
       activity_json = EXCLUDED.activity_json,
       arrived_at_json = EXCLUDED.arrived_at_json,
       interruptible = EXCLUDED.interruptible,
       schedule_slot_id = EXCLUDED.schedule_slot_id,
       updated_at = now()
     WHERE session_npc_location_state.owner_email = EXCLUDED.owner_email`,
    [
      genUUID(),
      ownerEmail,
      sessionId,
      npcId,
      state.locationId,
      state.subLocationId ?? null,
      activityStr,
      arrivedAtStr,
      state.interruptible ?? true,
      state.scheduleSlotId ?? null,
    ]
  );
}

/**
 * Bulk update NPC locations (e.g., during simulation).
 */
export async function bulkUpsertNpcLocationStates(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  states: {
    npcId: string;
    locationId: string;
    subLocationId?: string | null;
    activityJson: Record<string, unknown>;
    arrivedAtJson: Record<string, unknown>;
    interruptible?: boolean;
    scheduleSlotId?: string | null;
  }[]
): Promise<void> {
  if (states.length === 0) return;

  // Use a transaction for bulk operations
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const state of states) {
      const activityStr = JSON.stringify(state.activityJson ?? {});
      const arrivedAtStr = JSON.stringify(state.arrivedAtJson ?? {});

      await client.query(
        `INSERT INTO session_npc_location_state 
           (id, owner_email, session_id, npc_id, location_id, sub_location_id, activity_json, arrived_at_json, interruptible, schedule_slot_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
         ON CONFLICT (session_id, npc_id) DO UPDATE SET
           location_id = EXCLUDED.location_id,
           sub_location_id = EXCLUDED.sub_location_id,
           activity_json = EXCLUDED.activity_json,
           arrived_at_json = EXCLUDED.arrived_at_json,
           interruptible = EXCLUDED.interruptible,
           schedule_slot_id = EXCLUDED.schedule_slot_id,
           updated_at = now()
         WHERE session_npc_location_state.owner_email = EXCLUDED.owner_email`,
        [
          genUUID(),
          ownerEmail,
          sessionId,
          state.npcId,
          state.locationId,
          state.subLocationId ?? null,
          activityStr,
          arrivedAtStr,
          state.interruptible ?? true,
          state.scheduleSlotId ?? null,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete NPC location state for a specific NPC in a session.
 */
export async function deleteNpcLocationState(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<void> {
  await pool.query(
    'DELETE FROM session_npc_location_state WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3',
    [sessionId, ownerEmail, npcId]
  );
}

/**
 * Delete all NPC location states for a session.
 */
export async function deleteAllNpcLocationStates(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_npc_location_state WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );
  return res.rowCount ?? 0;
}

/**
 * Helper to convert a database row to an NpcLocationStateRecord.
 */
function npcLocationStateFromRow(row: Record<string, unknown>): NpcLocationStateRecord | null {
  const npcId = readStr(row, 'npc_id');
  if (!npcId) return null;

  return {
    id: readStr(row, 'id'),
    sessionId: readStr(row, 'session_id'),
    npcId,
    locationId: readStr(row, 'location_id', ''),
    subLocationId: readStr(row, 'sub_location_id', '') || null,
    activityJson: readJsonRecord(row['activity_json']) ?? {},
    arrivedAtJson: readJsonRecord(row['arrived_at_json']) ?? {},
    interruptible: row['interruptible'] === true,
    scheduleSlotId: readStr(row, 'schedule_slot_id', '') || null,
    createdAt: toIsoDate(row['created_at']),
    updatedAt: toIsoDate(row['updated_at']),
  };
}

// ============================================================================
// Location Occupancy Cache
// ============================================================================

/**
 * Occupancy cache record.
 */
export interface LocationOccupancyCacheRecord {
  id: UUID;
  sessionId: UUID;
  locationId: string;
  occupancyJson: Record<string, unknown>;
  computedAtJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get occupancy cache for a specific location.
 */
export async function getLocationOccupancyCache(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  locationId: string
): Promise<LocationOccupancyCacheRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_location_occupancy_cache 
     WHERE session_id = $1 AND owner_email = $2 AND location_id = $3 
     LIMIT 1`,
    [sessionId, ownerEmail, locationId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return occupancyCacheFromRow(row);
}

/**
 * Upsert occupancy cache for a location.
 */
export async function upsertLocationOccupancyCache(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  locationId: string,
  occupancyJson: Record<string, unknown>,
  computedAtJson: Record<string, unknown>
): Promise<void> {
  const occupancyStr = JSON.stringify(occupancyJson ?? {});
  const computedAtStr = JSON.stringify(computedAtJson ?? {});

  await pool.query(
    `INSERT INTO session_location_occupancy_cache 
       (id, owner_email, session_id, location_id, occupancy_json, computed_at_json)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
     ON CONFLICT (session_id, location_id) DO UPDATE SET
       occupancy_json = EXCLUDED.occupancy_json,
       computed_at_json = EXCLUDED.computed_at_json,
       updated_at = now()
     WHERE session_location_occupancy_cache.owner_email = EXCLUDED.owner_email`,
    [genUUID(), ownerEmail, sessionId, locationId, occupancyStr, computedAtStr]
  );
}

/**
 * Delete occupancy cache for a location.
 */
export async function deleteLocationOccupancyCache(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  locationId: string
): Promise<void> {
  await pool.query(
    'DELETE FROM session_location_occupancy_cache WHERE session_id = $1 AND owner_email = $2 AND location_id = $3',
    [sessionId, ownerEmail, locationId]
  );
}

/**
 * Delete all occupancy caches for a session.
 */
export async function deleteAllOccupancyCaches(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_location_occupancy_cache WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );
  return res.rowCount ?? 0;
}

/**
 * Helper to convert a database row to an LocationOccupancyCacheRecord.
 */
function occupancyCacheFromRow(row: Record<string, unknown>): LocationOccupancyCacheRecord | null {
  const locationId = readStr(row, 'location_id');
  if (!locationId) return null;

  return {
    id: readStr(row, 'id'),
    sessionId: readStr(row, 'session_id'),
    locationId,
    occupancyJson: readJsonRecord(row['occupancy_json']) ?? {},
    computedAtJson: readJsonRecord(row['computed_at_json']) ?? {},
    createdAt: toIsoDate(row['created_at']),
    updatedAt: toIsoDate(row['updated_at']),
  };
}

// ============================================================================
// NPC Simulation Cache
// ============================================================================

/**
 * Simulation cache record.
 * Stores cached simulation state and schedule decisions for lazy simulation.
 */
export interface NpcSimulationCacheRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  lastComputedAtJson: Record<string, unknown>;
  currentStateJson: Record<string, unknown>;
  dayDecisionsJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get simulation cache for a specific NPC in a session.
 */
export async function getNpcSimulationCache(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<NpcSimulationCacheRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_npc_simulation_cache 
     WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3 
     LIMIT 1`,
    [sessionId, ownerEmail, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return simulationCacheFromRow(row);
}

/**
 * Get all simulation caches for a session.
 */
export async function getAllNpcSimulationCaches(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<Map<string, NpcSimulationCacheRecord>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_npc_simulation_cache WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );

  const result = new Map<string, NpcSimulationCacheRecord>();
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    const cache = simulationCacheFromRow(rec);
    if (cache) {
      result.set(cache.npcId, cache);
    }
  }
  return result;
}

/**
 * Upsert simulation cache for a specific NPC.
 */
export async function upsertNpcSimulationCache(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  cache: {
    lastComputedAtJson: Record<string, unknown>;
    currentStateJson: Record<string, unknown>;
    dayDecisionsJson?: Record<string, unknown>;
  }
): Promise<void> {
  const lastComputedAtStr = JSON.stringify(cache.lastComputedAtJson ?? {});
  const currentStateStr = JSON.stringify(cache.currentStateJson ?? {});
  const dayDecisionsStr = JSON.stringify(cache.dayDecisionsJson ?? {});

  await pool.query(
    `INSERT INTO session_npc_simulation_cache 
       (id, owner_email, session_id, npc_id, last_computed_at_json, current_state_json, day_decisions_json)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       last_computed_at_json = EXCLUDED.last_computed_at_json,
       current_state_json = EXCLUDED.current_state_json,
       day_decisions_json = EXCLUDED.day_decisions_json,
       updated_at = now()
     WHERE session_npc_simulation_cache.owner_email = EXCLUDED.owner_email`,
    [genUUID(), ownerEmail, sessionId, npcId, lastComputedAtStr, currentStateStr, dayDecisionsStr]
  );
}

/**
 * Bulk update simulation caches (e.g., during batch simulation).
 */
export async function bulkUpsertNpcSimulationCaches(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  caches: {
    npcId: string;
    lastComputedAtJson: Record<string, unknown>;
    currentStateJson: Record<string, unknown>;
    dayDecisionsJson?: Record<string, unknown>;
  }[]
): Promise<void> {
  if (caches.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const cache of caches) {
      const lastComputedAtStr = JSON.stringify(cache.lastComputedAtJson ?? {});
      const currentStateStr = JSON.stringify(cache.currentStateJson ?? {});
      const dayDecisionsStr = JSON.stringify(cache.dayDecisionsJson ?? {});

      await client.query(
        `INSERT INTO session_npc_simulation_cache 
           (id, owner_email, session_id, npc_id, last_computed_at_json, current_state_json, day_decisions_json)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
         ON CONFLICT (session_id, npc_id) DO UPDATE SET
           last_computed_at_json = EXCLUDED.last_computed_at_json,
           current_state_json = EXCLUDED.current_state_json,
           day_decisions_json = EXCLUDED.day_decisions_json,
           updated_at = now()
         WHERE session_npc_simulation_cache.owner_email = EXCLUDED.owner_email`,
        [
          genUUID(),
          ownerEmail,
          sessionId,
          cache.npcId,
          lastComputedAtStr,
          currentStateStr,
          dayDecisionsStr,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete simulation cache for a specific NPC.
 */
export async function deleteNpcSimulationCache(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<void> {
  await pool.query(
    'DELETE FROM session_npc_simulation_cache WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3',
    [sessionId, ownerEmail, npcId]
  );
}

/**
 * Delete all simulation caches for a session.
 */
export async function deleteAllNpcSimulationCaches(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_npc_simulation_cache WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );
  return res.rowCount ?? 0;
}

/**
 * Invalidate stale simulation caches older than a given game time.
 * Useful after time advances or period changes.
 */
export async function invalidateStaleSimulationCaches(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  beforeTime: Record<string, unknown>
): Promise<number> {
  // This is a simplified invalidation - in practice you might want more
  // sophisticated JSONB queries to compare GameTime objects
  const beforeTimeStr = JSON.stringify(beforeTime);

  const res: QueryResult<DbRow> = await pool.query(
    `DELETE FROM session_npc_simulation_cache 
     WHERE session_id = $1 
       AND owner_email = $2
       AND last_computed_at_json < $3::jsonb`,
    [sessionId, ownerEmail, beforeTimeStr]
  );
  return res.rowCount ?? 0;
}

/**
 * Helper to convert a database row to an NpcSimulationCacheRecord.
 */
function simulationCacheFromRow(row: Record<string, unknown>): NpcSimulationCacheRecord | null {
  const npcId = readStr(row, 'npc_id');
  if (!npcId) return null;

  return {
    id: readStr(row, 'id'),
    sessionId: readStr(row, 'session_id'),
    npcId,
    lastComputedAtJson: readJsonRecord(row['last_computed_at_json']) ?? {},
    currentStateJson: readJsonRecord(row['current_state_json']) ?? {},
    dayDecisionsJson: readJsonRecord(row['day_decisions_json']) ?? {},
    createdAt: toIsoDate(row['created_at']),
    updatedAt: toIsoDate(row['updated_at']),
  };
}

// ============================================================================
// Player Interest Score
// ============================================================================

/**
 * Player interest score record from database.
 */
export interface PlayerInterestRecord {
  id: UUID;
  sessionId: UUID;
  npcId: string;
  score: number;
  totalInteractions: number;
  turnsSinceInteraction: number;
  peakScore: number;
  currentTier: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get player interest score for a specific NPC in a session.
 */
export async function getPlayerInterestScore(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<PlayerInterestRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_player_interest 
     WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3 
     LIMIT 1`,
    [sessionId, ownerEmail, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return playerInterestFromRow(row);
}

/**
 * Get all player interest scores for a session.
 */
export async function getAllPlayerInterestScores(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<Map<string, PlayerInterestRecord>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_player_interest WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );

  const result = new Map<string, PlayerInterestRecord>();
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    const record = playerInterestFromRow(rec);
    if (record) {
      result.set(record.npcId, record);
    }
  }
  return result;
}

/**
 * Get NPCs above a score threshold (for promotion checks).
 */
export async function getNpcsAboveInterestThreshold(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  threshold: number
): Promise<PlayerInterestRecord[]> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_player_interest 
     WHERE session_id = $1 AND owner_email = $2 AND score >= $3 
     ORDER BY score DESC`,
    [sessionId, ownerEmail, threshold]
  );

  const result: PlayerInterestRecord[] = [];
  for (const row of res.rows) {
    const rec = row as Record<string, unknown>;
    const record = playerInterestFromRow(rec);
    if (record) {
      result.push(record);
    }
  }
  return result;
}

/**
 * Upsert player interest score for an NPC.
 */
export async function upsertPlayerInterestScore(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  score: number,
  totalInteractions: number,
  turnsSinceInteraction: number,
  peakScore: number,
  currentTier: string
): Promise<void> {
  await pool.query(
    `INSERT INTO session_player_interest 
     (id, owner_email, session_id, npc_id, score, total_interactions, turns_since_interaction, peak_score, current_tier)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       score = EXCLUDED.score,
       total_interactions = EXCLUDED.total_interactions,
       turns_since_interaction = EXCLUDED.turns_since_interaction,
       peak_score = EXCLUDED.peak_score,
       current_tier = EXCLUDED.current_tier,
       updated_at = now()
     WHERE session_player_interest.owner_email = EXCLUDED.owner_email`,
    [
      genUUID(),
      ownerEmail,
      sessionId,
      npcId,
      score,
      totalInteractions,
      turnsSinceInteraction,
      peakScore,
      currentTier,
    ]
  );
}

/**
 * Update tier for an NPC after promotion.
 */
export async function updateNpcTier(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string,
  newTier: string
): Promise<void> {
  await pool.query(
    `UPDATE session_player_interest 
     SET current_tier = $4, updated_at = now()
     WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3`,
    [sessionId, ownerEmail, npcId, newTier]
  );
}

/**
 * Delete player interest score for an NPC.
 */
export async function deletePlayerInterestScore(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  npcId: string
): Promise<void> {
  await pool.query(
    'DELETE FROM session_player_interest WHERE session_id = $1 AND owner_email = $2 AND npc_id = $3',
    [sessionId, ownerEmail, npcId]
  );
}

/**
 * Delete all player interest scores for a session.
 */
export async function deleteAllPlayerInterestScores(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_player_interest WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );
  return res.rowCount ?? 0;
}

/**
 * Helper to convert a database row to a PlayerInterestRecord.
 */
function playerInterestFromRow(row: Record<string, unknown>): PlayerInterestRecord | null {
  const id = readStr(row, 'id');
  const sessionId = readStr(row, 'session_id');
  const npcId = readStr(row, 'npc_id');
  const score = row['score'];
  const totalInteractions = row['total_interactions'];
  const turnsSinceInteraction = row['turns_since_interaction'];
  const peakScore = row['peak_score'];
  const currentTier = readStr(row, 'current_tier');
  const createdAt = readStr(row, 'created_at');
  const updatedAt = readStr(row, 'updated_at');

  if (!id || !sessionId || !npcId || !currentTier || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    sessionId,
    npcId,
    score: typeof score === 'number' ? score : typeof score === 'string' ? parseFloat(score) : 0,
    totalInteractions:
      typeof totalInteractions === 'number'
        ? totalInteractions
        : typeof totalInteractions === 'string'
          ? parseInt(totalInteractions, 10)
          : 0,
    turnsSinceInteraction:
      typeof turnsSinceInteraction === 'number'
        ? turnsSinceInteraction
        : typeof turnsSinceInteraction === 'string'
          ? parseInt(turnsSinceInteraction, 10)
          : 0,
    peakScore:
      typeof peakScore === 'number'
        ? peakScore
        : typeof peakScore === 'string'
          ? parseFloat(peakScore)
          : 0,
    currentTier,
    createdAt,
    updatedAt,
  };
}

// ============================================================================
// Session Workspace Drafts
// ============================================================================

/**
 * Session workspace draft record.
 * Stores in-progress session configurations before finalization.
 */
export interface WorkspaceDraftRecord {
  id: UUID;
  userId: string;
  name: string | null;
  workspaceState: Record<string, unknown>;
  currentStep: string;
  validationState: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new workspace draft.
 */
export async function createWorkspaceDraft(params: {
  userId?: string;
  name?: string;
  workspaceState?: Record<string, unknown>;
  currentStep?: string;
}): Promise<WorkspaceDraftRecord> {
  const id = genUUID();
  const userId = params.userId ?? 'default';
  const name = params.name ?? null;
  const workspaceState = params.workspaceState ?? {};
  const currentStep = params.currentStep ?? 'setting';

  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO session_workspace_drafts 
     (id, user_id, name, workspace_state, current_step)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING *`,
    [id, userId, name, JSON.stringify(workspaceState), currentStep]
  );

  const row = res.rows[0] as Record<string, unknown>;
  return workspaceDraftFromRow(row)!;
}

/**
 * Get a workspace draft by ID.
 */
export async function getWorkspaceDraft(id: UUID): Promise<WorkspaceDraftRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_workspace_drafts WHERE id = $1 LIMIT 1',
    [id]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return workspaceDraftFromRow(row);
}

/**
 * List workspace drafts for a user.
 */
export async function listWorkspaceDrafts(
  userId: string,
  options?: { limit?: number }
): Promise<WorkspaceDraftRecord[]> {
  const limit = options?.limit ?? 20;
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_workspace_drafts 
     WHERE user_id = $1 
     ORDER BY updated_at DESC 
     LIMIT $2`,
    [userId, limit]
  );

  return res.rows
    .map((row) => workspaceDraftFromRow(row as Record<string, unknown>))
    .filter((d): d is WorkspaceDraftRecord => d !== null);
}

/**
 * Update a workspace draft.
 */
export async function updateWorkspaceDraft(
  id: UUID,
  updates: {
    name?: string | null;
    workspaceState?: Record<string, unknown>;
    currentStep?: string;
    validationState?: Record<string, unknown>;
  }
): Promise<WorkspaceDraftRecord | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.workspaceState !== undefined) {
    setClauses.push(`workspace_state = $${idx++}::jsonb`);
    values.push(JSON.stringify(updates.workspaceState));
  }
  if (updates.currentStep !== undefined) {
    setClauses.push(`current_step = $${idx++}`);
    values.push(updates.currentStep);
  }
  if (updates.validationState !== undefined) {
    setClauses.push(`validation_state = $${idx++}::jsonb`);
    values.push(JSON.stringify(updates.validationState));
  }

  if (setClauses.length === 0) {
    return getWorkspaceDraft(id);
  }

  setClauses.push('updated_at = now()');

  const res: QueryResult<DbRow> = await pool.query(
    `UPDATE session_workspace_drafts 
     SET ${setClauses.join(', ')} 
     WHERE id = $1 
     RETURNING *`,
    values
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return workspaceDraftFromRow(row);
}

/**
 * Delete a workspace draft.
 */
export async function deleteWorkspaceDraft(id: UUID): Promise<boolean> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_workspace_drafts WHERE id = $1',
    [id]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Delete old workspace drafts (older than specified days).
 */
export async function pruneOldWorkspaceDrafts(olderThanDays = 30): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    `DELETE FROM session_workspace_drafts 
     WHERE created_at < now() - interval '1 day' * $1`,
    [olderThanDays]
  );
  return res.rowCount ?? 0;
}

/**
 * Helper to convert a database row to a WorkspaceDraftRecord.
 */
function workspaceDraftFromRow(row: Record<string, unknown>): WorkspaceDraftRecord | null {
  const id = readStr(row, 'id');
  if (!id) return null;

  return {
    id: id,
    userId: readStr(row, 'user_id', 'default'),
    name: readStr(row, 'name', '') || null,
    workspaceState: readJsonRecord(row['workspace_state']) ?? {},
    currentStep: readStr(row, 'current_step', 'setting'),
    validationState: readJsonRecord(row['validation_state']) ?? {},
    createdAt: toIsoDate(row['created_at']),
    updatedAt: toIsoDate(row['updated_at']),
  };
}

// =============================================================================
// Session Location Map
// =============================================================================

/**
 * Location map record attached to a session.
 */
export interface SessionLocationMapRecord {
  id: UUID;
  sessionId: UUID;
  locationMapId: UUID;
  overridesJson: Record<string, unknown>;
  createdAt: string;
  /** The full location map data (from joined location_maps table) */
  locationMap?: {
    id: UUID;
    settingId: UUID;
    name: string;
    description: string | null;
    isTemplate: boolean;
    nodesJson: unknown[];
    connectionsJson: unknown[];
    defaultStartLocationId: string | null;
    tags: string[];
  };
}

/**
 * Get the location map attached to a session.
 * Joins with location_maps to get the full map data.
 */
export async function getSessionLocationMap(
  sessionId: UUID
): Promise<SessionLocationMapRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT 
       slm.id,
       slm.session_id,
       slm.location_map_id,
       slm.overrides_json,
       slm.created_at,
       lm.id as map_id,
       lm.setting_id,
       lm.name as map_name,
       lm.description as map_description,
       lm.is_template,
       lm.nodes_json,
       lm.connections_json,
       lm.default_start_location_id,
       lm.tags as map_tags
     FROM session_location_maps slm
     JOIN location_maps lm ON slm.location_map_id = lm.id
     WHERE slm.session_id = $1`,
    [sessionId]
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0] as Record<string, unknown>;
  return sessionLocationMapFromRow(row);
}

/**
 * Create a session location map binding.
 */
export async function createSessionLocationMap(
  sessionId: UUID,
  locationMapId: UUID,
  overrides: Record<string, unknown> = {}
): Promise<SessionLocationMapRecord | null> {
  const id = genUUID();
  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO session_location_maps (id, session_id, location_map_id, overrides_json)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (session_id) DO UPDATE SET 
       location_map_id = EXCLUDED.location_map_id,
       overrides_json = EXCLUDED.overrides_json
     RETURNING *`,
    [id, sessionId, locationMapId, JSON.stringify(overrides)]
  );

  if (res.rows.length === 0) return null;

  // Fetch the full record with joined map data
  return getSessionLocationMap(sessionId);
}

/**
 * Delete the session location map binding.
 */
export async function deleteSessionLocationMap(sessionId: UUID): Promise<boolean> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_location_maps WHERE session_id = $1',
    [sessionId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Helper to convert a database row to a SessionLocationMapRecord.
 */
function sessionLocationMapFromRow(row: Record<string, unknown>): SessionLocationMapRecord | null {
  const id = readStr(row, 'id');
  if (!id) return null;

  const record: SessionLocationMapRecord = {
    id: id,
    sessionId: readStr(row, 'session_id'),
    locationMapId: readStr(row, 'location_map_id'),
    overridesJson: readJsonRecord(row['overrides_json']) ?? {},
    createdAt: toIsoDate(row['created_at']),
  };

  // Include joined location map data if present
  if (row['map_id']) {
    record.locationMap = {
      id: readStr(row, 'map_id'),
      settingId: readStr(row, 'setting_id'),
      name: readStr(row, 'map_name'),
      description: typeof row['map_description'] === 'string' ? row['map_description'] : null,
      isTemplate: row['is_template'] === true,
      nodesJson: Array.isArray(row['nodes_json']) ? row['nodes_json'] : [],
      connectionsJson: Array.isArray(row['connections_json']) ? row['connections_json'] : [],
      defaultStartLocationId:
        typeof row['default_start_location_id'] === 'string'
          ? row['default_start_location_id']
          : null,
      tags: Array.isArray(row['map_tags']) ? (row['map_tags'] as string[]) : [],
    };
  }

  return record;
}

// =============================================================================
// Tool Call History Functions
// =============================================================================

/**
 * Record of a tool call made during a turn.
 */
export interface ToolCallRecord {
  id: UUID;
  sessionId: UUID;
  turnIdx: number;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolResult: Record<string, unknown> | null;
  success: boolean;
  createdAt: string;
}

/**
 * Append a tool call to the history.
 * Called after each tool execution during a turn.
 */
export async function appendToolCallHistory(params: {
  ownerEmail: OwnerEmail;
  sessionId: UUID;
  turnIdx: number;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolResult?: Record<string, unknown>;
  success: boolean;
}): Promise<void> {
  const id = genUUID();
  await pool.query(
    `INSERT INTO tool_call_history (id, owner_email, session_id, turn_idx, tool_name, tool_args, tool_result, success)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
    [
      id,
      params.ownerEmail,
      params.sessionId,
      params.turnIdx,
      params.toolName,
      JSON.stringify(params.toolArgs),
      params.toolResult ? JSON.stringify(params.toolResult) : null,
      params.success,
    ]
  );
}

/**
 * Append multiple tool calls at once (batch insert).
 */
export async function appendToolCallHistoryBatch(
  calls: {
    ownerEmail: OwnerEmail;
    sessionId: UUID;
    turnIdx: number;
    toolName: string;
    toolArgs: Record<string, unknown>;
    toolResult: Record<string, unknown> | undefined;
    success: boolean;
  }[]
): Promise<void> {
  if (calls.length === 0) return;

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let paramIdx = 1;

  for (const call of calls) {
    const id = genUUID();
    placeholders.push(
      `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}::jsonb, $${paramIdx + 6}::jsonb, $${paramIdx + 7})`
    );
    values.push(
      id,
      call.ownerEmail,
      call.sessionId,
      call.turnIdx,
      call.toolName,
      JSON.stringify(call.toolArgs),
      call.toolResult ? JSON.stringify(call.toolResult) : null,
      call.success
    );
    paramIdx += 8;
  }

  await pool.query(
    `INSERT INTO tool_call_history (id, owner_email, session_id, turn_idx, tool_name, tool_args, tool_result, success)
     VALUES ${placeholders.join(', ')}`,
    values
  );
}

/**
 * Get recent tool calls for a session.
 * Returns tool calls from the most recent N turns.
 */
export async function getRecentToolCalls(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  options: { turnLimit?: number; limit?: number } = {}
): Promise<ToolCallRecord[]> {
  const turnLimit = options.turnLimit ?? 10;
  const limit = options.limit ?? 50;

  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM tool_call_history 
     WHERE session_id = $1 
       AND owner_email = $2
       AND turn_idx > (
         SELECT COALESCE(MAX(turn_idx), 0) - $3
         FROM tool_call_history
         WHERE session_id = $1 AND owner_email = $2
       )
     ORDER BY turn_idx DESC, created_at DESC
     LIMIT $4`,
    [sessionId, ownerEmail, turnLimit, limit]
  );

  return res.rows.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      id: readStr(rec, 'id'),
      sessionId: readStr(rec, 'session_id'),
      turnIdx: Number(rec['turn_idx'] ?? 0),
      toolName: readStr(rec, 'tool_name'),
      toolArgs: readJsonRecord(rec['tool_args']) ?? {},
      toolResult: readJsonRecord(rec['tool_result']),
      success: rec['success'] === true,
      createdAt: toIsoDate(rec['created_at']),
    };
  });
}

/**
 * Get tool call statistics for a session.
 * Useful for understanding tool usage patterns.
 */
export async function getToolCallStats(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<{
  totalCalls: number;
  callsByTool: Record<string, number>;
  recentTools: string[];
}> {
  // Get count by tool name
  const statsRes: QueryResult<DbRow> = await pool.query(
    `SELECT tool_name, COUNT(*) as call_count 
     FROM tool_call_history 
     WHERE session_id = $1 AND owner_email = $2
     GROUP BY tool_name 
     ORDER BY call_count DESC`,
    [sessionId, ownerEmail]
  );

  const callsByTool: Record<string, number> = {};
  let totalCalls = 0;

  for (const row of statsRes.rows) {
    const rec = row as Record<string, unknown>;
    const name = readStr(rec, 'tool_name');
    const count = Number(rec['call_count'] ?? 0);
    callsByTool[name] = count;
    totalCalls += count;
  }

  // Get most recent distinct tools (last 5 turns)
  const recentRes: QueryResult<DbRow> = await pool.query(
    `SELECT DISTINCT tool_name 
     FROM tool_call_history 
     WHERE session_id = $1 AND owner_email = $2
       AND turn_idx > (
         SELECT COALESCE(MAX(turn_idx), 0) - 5
         FROM tool_call_history
         WHERE session_id = $1 AND owner_email = $2
       )
     ORDER BY tool_name`,
    [sessionId, ownerEmail]
  );

  const recentTools = recentRes.rows.map((r) => readStr(r as Record<string, unknown>, 'tool_name'));

  return { totalCalls, callsByTool, recentTools };
}

/**
 * Delete tool call history for a session.
 */
export async function deleteToolCallHistory(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<void> {
  await pool.query('DELETE FROM tool_call_history WHERE session_id = $1 AND owner_email = $2', [
    sessionId,
    ownerEmail,
  ]);
}

// =============================================================================
// Conversation Summary Functions
// =============================================================================

/**
 * Conversation summary record.
 */
export interface ConversationSummaryRecord {
  id: UUID;
  sessionId: UUID;
  summaryType: 'general' | 'tool_usage' | 'npc_specific';
  npcId: string | null;
  summaryText: string;
  coversUpToTurn: number;
  toolUsageHints: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Upsert a conversation summary.
 * Updates if exists for this session/type/npc combo, otherwise inserts.
 */
export async function upsertConversationSummary(params: {
  ownerEmail: OwnerEmail;
  sessionId: UUID;
  summaryType: 'general' | 'tool_usage' | 'npc_specific';
  npcId?: string;
  summaryText: string;
  coversUpToTurn: number;
  toolUsageHints?: string[];
}): Promise<ConversationSummaryRecord> {
  const id = genUUID();
  const hints = params.toolUsageHints ?? [];

  const res: QueryResult<DbRow> = await pool.query(
    `INSERT INTO conversation_summaries 
       (id, owner_email, session_id, summary_type, npc_id, summary_text, covers_up_to_turn, tool_usage_hints)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (session_id, summary_type, COALESCE(npc_id, '')) 
     DO UPDATE SET 
       summary_text = EXCLUDED.summary_text,
       covers_up_to_turn = EXCLUDED.covers_up_to_turn,
       tool_usage_hints = EXCLUDED.tool_usage_hints,
       updated_at = now()
     WHERE conversation_summaries.owner_email = EXCLUDED.owner_email
     RETURNING *`,
    [
      id,
      params.ownerEmail,
      params.sessionId,
      params.summaryType,
      params.npcId ?? null,
      params.summaryText,
      params.coversUpToTurn,
      hints,
    ]
  );

  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: readStr(row, 'id'),
    sessionId: readStr(row, 'session_id'),
    summaryType: readStr(row, 'summary_type') as 'general' | 'tool_usage' | 'npc_specific',
    npcId: typeof row['npc_id'] === 'string' ? row['npc_id'] : null,
    summaryText: readStr(row, 'summary_text'),
    coversUpToTurn: Number(row['covers_up_to_turn'] ?? 0),
    toolUsageHints: Array.isArray(row['tool_usage_hints'])
      ? (row['tool_usage_hints'] as string[])
      : [],
    createdAt: toIsoDate(row['created_at']),
    updatedAt: toIsoDate(row['updated_at']),
  };
}

/**
 * Get conversation summary for a session.
 */
export async function getConversationSummary(
  ownerEmail: OwnerEmail,
  sessionId: UUID,
  summaryType: 'general' | 'tool_usage' | 'npc_specific' = 'general',
  npcId?: string
): Promise<ConversationSummaryRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM conversation_summaries 
     WHERE session_id = $1 AND owner_email = $2 AND summary_type = $3 AND COALESCE(npc_id, '') = $4`,
    [sessionId, ownerEmail, summaryType, npcId ?? '']
  );

  if (res.rows.length === 0) return null;

  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: readStr(row, 'id'),
    sessionId: readStr(row, 'session_id'),
    summaryType: readStr(row, 'summary_type') as 'general' | 'tool_usage' | 'npc_specific',
    npcId: typeof row['npc_id'] === 'string' ? row['npc_id'] : null,
    summaryText: readStr(row, 'summary_text'),
    coversUpToTurn: Number(row['covers_up_to_turn'] ?? 0),
    toolUsageHints: Array.isArray(row['tool_usage_hints'])
      ? (row['tool_usage_hints'] as string[])
      : [],
    createdAt: toIsoDate(row['created_at']),
    updatedAt: toIsoDate(row['updated_at']),
  };
}

/**
 * Get all summaries for a session.
 */
export async function getAllConversationSummaries(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<ConversationSummaryRecord[]> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM conversation_summaries WHERE session_id = $1 AND owner_email = $2 ORDER BY summary_type, npc_id',
    [sessionId, ownerEmail]
  );

  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: readStr(row, 'id'),
      sessionId: readStr(row, 'session_id'),
      summaryType: readStr(row, 'summary_type') as 'general' | 'tool_usage' | 'npc_specific',
      npcId: typeof row['npc_id'] === 'string' ? row['npc_id'] : null,
      summaryText: readStr(row, 'summary_text'),
      coversUpToTurn: Number(row['covers_up_to_turn'] ?? 0),
      toolUsageHints: Array.isArray(row['tool_usage_hints'])
        ? (row['tool_usage_hints'] as string[])
        : [],
      createdAt: toIsoDate(row['created_at']),
      updatedAt: toIsoDate(row['updated_at']),
    };
  });
}

/**
 * Delete conversation summaries for a session.
 */
export async function deleteConversationSummaries(
  ownerEmail: OwnerEmail,
  sessionId: UUID
): Promise<void> {
  await pool.query(
    'DELETE FROM conversation_summaries WHERE session_id = $1 AND owner_email = $2',
    [sessionId, ownerEmail]
  );
}
