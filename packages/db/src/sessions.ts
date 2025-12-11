import { randomUUID } from 'node:crypto';
import { pool } from './client.js';
import type {
  DbRow,
  MessageRole,
  MessageSpeaker,
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

export async function appendMessage(
  sessionId: UUID,
  role: MessageRole,
  content: string,
  speaker?: MessageSpeaker
) {
  // Determine next idx for the session
  const lastRes: QueryResult<DbRow> = await pool.query(
    'SELECT idx FROM messages WHERE session_id = $1 ORDER BY idx DESC LIMIT 1',
    [sessionId]
  );
  const last = lastRes.rows[0] as Record<string, unknown> | undefined;
  const nextIdx = (Number(last?.['idx'] ?? 0) || 0) + 1;

  if (speaker && speaker.id && speaker.name) {
    // Insert with speaker metadata for assistant messages
    await pool.query(
      'INSERT INTO messages (id, session_id, idx, role, content, speaker_id, speaker_name, speaker_profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        genUUID(),
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
      'INSERT INTO messages (id, session_id, idx, role, content) VALUES ($1, $2, $3, $4, $5)',
      [genUUID(), sessionId, nextIdx, role, content]
    );
  }
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
// Session history with debug context
// ---------------------------------------------------------------------------

export async function appendSessionHistoryEntry(params: {
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
    `INSERT INTO session_history (id, session_id, turn_idx, owner_user_id, player_input, context_json, debug_json)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
     ON CONFLICT (session_id, turn_idx) DO UPDATE SET
       owner_user_id = EXCLUDED.owner_user_id,
       player_input = EXCLUDED.player_input,
       context_json = COALESCE(EXCLUDED.context_json, session_history.context_json),
       debug_json = COALESCE(EXCLUDED.debug_json, session_history.debug_json)
     RETURNING *`,
    [id, params.sessionId, params.turnIdx, ownerUserId, params.playerInput, contextJson, debugJson]
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
      id, session_id, actor_id, actor_type, action_type,
      content, observable_by, location_id, turn_number, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    RETURNING *`,
    [
      id,
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
  sessionId: UUID,
  options?: {
    locationId?: string;
    turnNumber?: number;
    limit?: number;
    orderBy?: 'asc' | 'desc';
  }
): Promise<SceneAction[]> {
  const params: unknown[] = [sessionId];
  const conditions: string[] = ['session_id = $1'];
  let paramCount = 1;

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
export async function getRecentSceneActions(sessionId: UUID, limit = 20): Promise<SceneAction[]> {
  return getSceneActions(sessionId, { limit, orderBy: 'desc' });
}

/**
 * Delete scene actions older than a certain number of turns to keep the table manageable.
 */
export async function pruneOldSceneActions(sessionId: UUID, keepRecentTurns = 10): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    `DELETE FROM scene_actions
     WHERE session_id = $1
       AND turn_number IS NOT NULL
       AND turn_number < (
         SELECT MAX(turn_number) - $2
         FROM scene_actions
         WHERE session_id = $1
       )`,
    [sessionId, keepRecentTurns]
  );

  return res.rowCount ?? 0;
}

/**
 * Delete all scene actions for a session.
 */
export async function deleteSceneActions(sessionId: UUID): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM scene_actions WHERE session_id = $1',
    [sessionId]
  );

  return res.rowCount ?? 0;
}

/**
 * Helper to convert a database row to a SceneAction object.
 */
function sceneActionFromRow(row: Record<string, unknown>): SceneAction {
  return {
    id: readStr(row, 'id', '') as UUID,
    sessionId: readStr(row, 'session_id', '') as UUID,
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
