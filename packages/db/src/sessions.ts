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
  sessionId: UUID,
  npcId: string
): Promise<SessionSliceState | null> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT state_json FROM session_affinity_state WHERE session_id = $1 AND npc_id = $2 LIMIT 1',
    [sessionId, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return readJsonObject(row, 'state_json');
}

/**
 * Get all affinity states for a session (all NPCs).
 */
export async function getAllAffinityStates(
  sessionId: UUID
): Promise<Map<string, SessionSliceState>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT npc_id, state_json FROM session_affinity_state WHERE session_id = $1',
    [sessionId]
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
  sessionId: UUID,
  npcId: string,
  state: SessionSliceState
): Promise<void> {
  const stateJson = JSON.stringify(state ?? {});
  await pool.query(
    `INSERT INTO session_affinity_state (id, session_id, npc_id, state_json)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       updated_at = now()`,
    [genUUID(), sessionId, npcId, stateJson]
  );
}

/**
 * Delete affinity state for a specific NPC in a session.
 */
export async function deleteAffinityState(sessionId: UUID, npcId: string): Promise<void> {
  await pool.query('DELETE FROM session_affinity_state WHERE session_id = $1 AND npc_id = $2', [
    sessionId,
    npcId,
  ]);
}

/**
 * Delete all affinity states for a session.
 */
export async function deleteAllAffinityStates(sessionId: UUID): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_affinity_state WHERE session_id = $1',
    [sessionId]
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
  sessionId: UUID,
  npcId: string
): Promise<NpcLocationStateRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_npc_location_state 
     WHERE session_id = $1 AND npc_id = $2 
     LIMIT 1`,
    [sessionId, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return npcLocationStateFromRow(row);
}

/**
 * Get all NPC location states for a session.
 */
export async function getAllNpcLocationStates(
  sessionId: UUID
): Promise<Map<string, NpcLocationStateRecord>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_npc_location_state WHERE session_id = $1',
    [sessionId]
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
  sessionId: UUID,
  locationId: string
): Promise<NpcLocationStateRecord[]> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_npc_location_state 
     WHERE session_id = $1 AND location_id = $2`,
    [sessionId, locationId]
  );

  return res.rows.map((row) => npcLocationStateFromRow(row as Record<string, unknown>)!);
}

/**
 * Upsert NPC location state for a specific NPC in a session.
 */
export async function upsertNpcLocationState(
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
       (id, session_id, npc_id, location_id, sub_location_id, activity_json, arrived_at_json, interruptible, schedule_slot_id)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       location_id = EXCLUDED.location_id,
       sub_location_id = EXCLUDED.sub_location_id,
       activity_json = EXCLUDED.activity_json,
       arrived_at_json = EXCLUDED.arrived_at_json,
       interruptible = EXCLUDED.interruptible,
       schedule_slot_id = EXCLUDED.schedule_slot_id,
       updated_at = now()`,
    [
      genUUID(),
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
  sessionId: UUID,
  states: Array<{
    npcId: string;
    locationId: string;
    subLocationId?: string | null;
    activityJson: Record<string, unknown>;
    arrivedAtJson: Record<string, unknown>;
    interruptible?: boolean;
    scheduleSlotId?: string | null;
  }>
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
           (id, session_id, npc_id, location_id, sub_location_id, activity_json, arrived_at_json, interruptible, schedule_slot_id)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
         ON CONFLICT (session_id, npc_id) DO UPDATE SET
           location_id = EXCLUDED.location_id,
           sub_location_id = EXCLUDED.sub_location_id,
           activity_json = EXCLUDED.activity_json,
           arrived_at_json = EXCLUDED.arrived_at_json,
           interruptible = EXCLUDED.interruptible,
           schedule_slot_id = EXCLUDED.schedule_slot_id,
           updated_at = now()`,
        [
          genUUID(),
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
export async function deleteNpcLocationState(sessionId: UUID, npcId: string): Promise<void> {
  await pool.query('DELETE FROM session_npc_location_state WHERE session_id = $1 AND npc_id = $2', [
    sessionId,
    npcId,
  ]);
}

/**
 * Delete all NPC location states for a session.
 */
export async function deleteAllNpcLocationStates(sessionId: UUID): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_npc_location_state WHERE session_id = $1',
    [sessionId]
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
    id: readStr(row, 'id') as UUID,
    sessionId: readStr(row, 'session_id') as UUID,
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
  sessionId: UUID,
  locationId: string
): Promise<LocationOccupancyCacheRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_location_occupancy_cache 
     WHERE session_id = $1 AND location_id = $2 
     LIMIT 1`,
    [sessionId, locationId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return occupancyCacheFromRow(row);
}

/**
 * Upsert occupancy cache for a location.
 */
export async function upsertLocationOccupancyCache(
  sessionId: UUID,
  locationId: string,
  occupancyJson: Record<string, unknown>,
  computedAtJson: Record<string, unknown>
): Promise<void> {
  const occupancyStr = JSON.stringify(occupancyJson ?? {});
  const computedAtStr = JSON.stringify(computedAtJson ?? {});

  await pool.query(
    `INSERT INTO session_location_occupancy_cache 
       (id, session_id, location_id, occupancy_json, computed_at_json)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
     ON CONFLICT (session_id, location_id) DO UPDATE SET
       occupancy_json = EXCLUDED.occupancy_json,
       computed_at_json = EXCLUDED.computed_at_json,
       updated_at = now()`,
    [genUUID(), sessionId, locationId, occupancyStr, computedAtStr]
  );
}

/**
 * Delete occupancy cache for a location.
 */
export async function deleteLocationOccupancyCache(
  sessionId: UUID,
  locationId: string
): Promise<void> {
  await pool.query(
    'DELETE FROM session_location_occupancy_cache WHERE session_id = $1 AND location_id = $2',
    [sessionId, locationId]
  );
}

/**
 * Delete all occupancy caches for a session.
 */
export async function deleteAllOccupancyCaches(sessionId: UUID): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_location_occupancy_cache WHERE session_id = $1',
    [sessionId]
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
    id: readStr(row, 'id') as UUID,
    sessionId: readStr(row, 'session_id') as UUID,
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
  sessionId: UUID,
  npcId: string
): Promise<NpcSimulationCacheRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_npc_simulation_cache 
     WHERE session_id = $1 AND npc_id = $2 
     LIMIT 1`,
    [sessionId, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return simulationCacheFromRow(row);
}

/**
 * Get all simulation caches for a session.
 */
export async function getAllNpcSimulationCaches(
  sessionId: UUID
): Promise<Map<string, NpcSimulationCacheRecord>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_npc_simulation_cache WHERE session_id = $1',
    [sessionId]
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
       (id, session_id, npc_id, last_computed_at_json, current_state_json, day_decisions_json)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       last_computed_at_json = EXCLUDED.last_computed_at_json,
       current_state_json = EXCLUDED.current_state_json,
       day_decisions_json = EXCLUDED.day_decisions_json,
       updated_at = now()`,
    [genUUID(), sessionId, npcId, lastComputedAtStr, currentStateStr, dayDecisionsStr]
  );
}

/**
 * Bulk update simulation caches (e.g., during batch simulation).
 */
export async function bulkUpsertNpcSimulationCaches(
  sessionId: UUID,
  caches: Array<{
    npcId: string;
    lastComputedAtJson: Record<string, unknown>;
    currentStateJson: Record<string, unknown>;
    dayDecisionsJson?: Record<string, unknown>;
  }>
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
           (id, session_id, npc_id, last_computed_at_json, current_state_json, day_decisions_json)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
         ON CONFLICT (session_id, npc_id) DO UPDATE SET
           last_computed_at_json = EXCLUDED.last_computed_at_json,
           current_state_json = EXCLUDED.current_state_json,
           day_decisions_json = EXCLUDED.day_decisions_json,
           updated_at = now()`,
        [genUUID(), sessionId, cache.npcId, lastComputedAtStr, currentStateStr, dayDecisionsStr]
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
export async function deleteNpcSimulationCache(sessionId: UUID, npcId: string): Promise<void> {
  await pool.query(
    'DELETE FROM session_npc_simulation_cache WHERE session_id = $1 AND npc_id = $2',
    [sessionId, npcId]
  );
}

/**
 * Delete all simulation caches for a session.
 */
export async function deleteAllNpcSimulationCaches(sessionId: UUID): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_npc_simulation_cache WHERE session_id = $1',
    [sessionId]
  );
  return res.rowCount ?? 0;
}

/**
 * Invalidate stale simulation caches older than a given game time.
 * Useful after time advances or period changes.
 */
export async function invalidateStaleSimulationCaches(
  sessionId: UUID,
  beforeTime: Record<string, unknown>
): Promise<number> {
  // This is a simplified invalidation - in practice you might want more
  // sophisticated JSONB queries to compare GameTime objects
  const beforeTimeStr = JSON.stringify(beforeTime);

  const res: QueryResult<DbRow> = await pool.query(
    `DELETE FROM session_npc_simulation_cache 
     WHERE session_id = $1 
       AND last_computed_at_json < $2::jsonb`,
    [sessionId, beforeTimeStr]
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
    id: readStr(row, 'id') as UUID,
    sessionId: readStr(row, 'session_id') as UUID,
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
  sessionId: UUID,
  npcId: string
): Promise<PlayerInterestRecord | null> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_player_interest 
     WHERE session_id = $1 AND npc_id = $2 
     LIMIT 1`,
    [sessionId, npcId]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as Record<string, unknown>;
  return playerInterestFromRow(row);
}

/**
 * Get all player interest scores for a session.
 */
export async function getAllPlayerInterestScores(
  sessionId: UUID
): Promise<Map<string, PlayerInterestRecord>> {
  const res: QueryResult<DbRow> = await pool.query(
    'SELECT * FROM session_player_interest WHERE session_id = $1',
    [sessionId]
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
  sessionId: UUID,
  threshold: number
): Promise<PlayerInterestRecord[]> {
  const res: QueryResult<DbRow> = await pool.query(
    `SELECT * FROM session_player_interest 
     WHERE session_id = $1 AND score >= $2 
     ORDER BY score DESC`,
    [sessionId, threshold]
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
     (id, session_id, npc_id, score, total_interactions, turns_since_interaction, peak_score, current_tier)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (session_id, npc_id) DO UPDATE SET
       score = EXCLUDED.score,
       total_interactions = EXCLUDED.total_interactions,
       turns_since_interaction = EXCLUDED.turns_since_interaction,
       peak_score = EXCLUDED.peak_score,
       current_tier = EXCLUDED.current_tier,
       updated_at = now()`,
    [
      genUUID(),
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
  sessionId: UUID,
  npcId: string,
  newTier: string
): Promise<void> {
  await pool.query(
    `UPDATE session_player_interest 
     SET current_tier = $3, updated_at = now()
     WHERE session_id = $1 AND npc_id = $2`,
    [sessionId, npcId, newTier]
  );
}

/**
 * Delete player interest score for an NPC.
 */
export async function deletePlayerInterestScore(sessionId: UUID, npcId: string): Promise<void> {
  await pool.query('DELETE FROM session_player_interest WHERE session_id = $1 AND npc_id = $2', [
    sessionId,
    npcId,
  ]);
}

/**
 * Delete all player interest scores for a session.
 */
export async function deleteAllPlayerInterestScores(sessionId: UUID): Promise<number> {
  const res: QueryResult<DbRow> = await pool.query(
    'DELETE FROM session_player_interest WHERE session_id = $1',
    [sessionId]
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
    id: id as UUID,
    sessionId: sessionId as UUID,
    npcId,
    score: typeof score === 'number' ? score : parseFloat(String(score ?? '0')),
    totalInteractions:
      typeof totalInteractions === 'number'
        ? totalInteractions
        : parseInt(String(totalInteractions ?? '0'), 10),
    turnsSinceInteraction:
      typeof turnsSinceInteraction === 'number'
        ? turnsSinceInteraction
        : parseInt(String(turnsSinceInteraction ?? '0'), 10),
    peakScore: typeof peakScore === 'number' ? peakScore : parseFloat(String(peakScore ?? '0')),
    currentTier,
    createdAt,
    updatedAt,
  };
}
