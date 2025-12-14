import { Pool } from 'pg';
import { registerType } from './pgvector.js';
import type {
  CharacterInstanceRow,
  CharacterTemplateRow,
  CharacterProfileRow,
  SettingProfileRow,
  PersonaProfileRow,
  DbRow,
  DbRows,
  ItemDefinitionRow,
  ItemInstanceRow,
  MessageRow,
  NpcHygieneStateRow,
  NpcScheduleRow,
  PgClientLike,
  PgPoolStrict,
  PersonaRow,
  QueryResult,
  ScheduleTemplateRow,
  SessionPersonaRow,
  SettingInstanceRow,
  SettingTemplateRow,
  SqlParams,
  UserSessionRow,
} from './types.js';

const env: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env ?? {};

export const resolvedDbUrl =
  env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/minirpg';
export const resolvedDbPath = resolvedDbUrl;

function createPool(url: string): unknown {
  const Ctor = Pool as unknown as new (config: { connectionString: string }) => unknown;
  return new Ctor({ connectionString: url });
}

// Create the pool and treat it as a strict Pg pool
const rawPool = createPool(resolvedDbUrl) as PgPoolStrict;

// Register pgvector types for each new client from the pool
// We cast to any here so we don't have to add `on` to PgPoolStrict
(rawPool as unknown as { on?: (event: string, listener: (client: unknown) => void) => void }).on?.(
  'connect',
  (client: unknown) => {
    (registerType as (client: unknown) => void)(client);
  }
);

export const pool: PgPoolStrict = rawPool;

async function query<T = DbRow>(text: string, params?: SqlParams): Promise<QueryResult<T>> {
  const client: PgClientLike = await pool.connect();
  try {
    const res = await client.query(text, params);
    const rc = (res as unknown as { rowCount?: number }).rowCount;
    return typeof rc === 'number'
      ? { rows: res.rows as T[], rowCount: rc }
      : { rows: res.rows as T[] };
  } finally {
    client.release();
  }
}

// Support tagged template queries
function buildQuery(
  strings: TemplateStringsArray,
  values: unknown[]
): { text: string; params: unknown[] } {
  const params: unknown[] = [];
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  }
  return { text, params };
}

function asDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v as unknown as string);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function camelizeRow<T extends DbRow>(row: DbRow): T {
  const out: DbRow = {};
  for (const k of Object.keys(row)) {
    const v = (row as Record<string, unknown>)[k];
    const ck = k.replace(/_[a-z]/g, (m) => m[1]!.toUpperCase());
    if (ck === 'createdAt' || ck === 'updatedAt') {
      (out as Record<string, unknown>)[ck] = asDate(v) ?? undefined;
    } else if (
      (ck === 'profileJson' || ck === 'templateSnapshot' || ck === 'overridesJson') &&
      typeof v === 'object' &&
      v !== null
    ) {
      // return stringified JSON to match previous Prisma shape
      (out as Record<string, unknown>)[ck] = JSON.stringify(v);
    } else {
      (out as Record<string, unknown>)[ck] = v;
    }
  }
  return out as T;
}

export const db = {
  async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<DbRows> {
    const { text, params } = buildQuery(strings, values);
    const { rows } = await query(text, params as SqlParams);
    return rows;
  },

  userSession: {
    async count(): Promise<number> {
      const { rows } = await query<{ count: string }>(
        'SELECT COUNT(*)::int AS count FROM user_sessions'
      );
      return Number(rows[0]?.count ?? 0);
    },
    async upsert(args: {
      where: { id: string };
      create: { id: string; characterTemplateId: string; settingTemplateId: string };
      update: { characterTemplateId: string; settingTemplateId: string };
    }): Promise<UserSessionRow> {
      const { id } = args.where;
      const { characterTemplateId, settingTemplateId } = args.create;
      const { rows } = await query(
        `INSERT INTO user_sessions (id, character_template_id, setting_template_id) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET character_template_id = EXCLUDED.character_template_id, setting_template_id = EXCLUDED.setting_template_id, updated_at = now()
         RETURNING *`,
        [id, characterTemplateId, settingTemplateId]
      );
      return camelizeRow<UserSessionRow>(rows[0]!);
    },
    async findUnique(args: {
      where: { id: string };
      include?: { messages?: { orderBy?: { idx?: 'asc' | 'desc' } } };
    }): Promise<UserSessionRow | null> {
      const { id } = args.where;
      const { rows } = await query('SELECT * FROM user_sessions WHERE id = $1 LIMIT 1', [id]);
      if (rows.length === 0) return null;
      const base = camelizeRow<UserSessionRow>(rows[0]!);
      if (args.include?.messages) {
        const order = args.include.messages.orderBy?.idx === 'asc' ? 'ASC' : 'DESC';
        const mres = await query(
          'SELECT * FROM messages WHERE session_id = $1 ORDER BY idx ' + order,
          [id]
        );
        base.messages = mres.rows.map((r) => camelizeRow<MessageRow>(r));
      }
      return base;
    },
    async findMany(args?: { orderBy?: { createdAt?: 'asc' | 'desc' } }): Promise<UserSessionRow[]> {
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';
      const { rows } = await query('SELECT * FROM user_sessions ORDER BY created_at ' + order);
      return rows.map((r) => camelizeRow<UserSessionRow>(r));
    },
    async delete(args: { where: { id: string } }) {
      await query('DELETE FROM user_sessions WHERE id = $1', [args.where.id]);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteMany(_args?: { where?: { sessionId?: string } }) {
      await query('TRUNCATE TABLE user_sessions CASCADE');
    },
  },

  message: {
    async count(): Promise<number> {
      const { rows } = await query<{ count: string }>(
        'SELECT COUNT(*)::int AS count FROM messages'
      );
      return Number(rows[0]?.count ?? 0);
    },
    async create(args: {
      data: { id: string; sessionId: string; idx: number; role: string; content: string };
    }): Promise<MessageRow> {
      const { id, sessionId, idx, role, content } = args.data;
      const { rows } = await query(
        'INSERT INTO messages (id, session_id, idx, role, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, sessionId, idx, role, content]
      );
      return camelizeRow<MessageRow>(rows[0]!);
    },
    async createMany(args: {
      data: { id: string; sessionId: string; idx: number; role: string; content: string }[];
    }) {
      for (const d of args.data) {
        await query(
          'INSERT INTO messages (id, session_id, idx, role, content) VALUES ($1, $2, $3, $4, $5)',
          [d.id, d.sessionId, d.idx, d.role, d.content]
        );
      }
      return { count: args.data.length };
    },
    async findFirst(args: {
      where: { sessionId: string; idx?: number };
      orderBy?: { idx?: 'asc' | 'desc' };
    }): Promise<MessageRow | null> {
      const { sessionId, idx } = args.where;
      if (typeof idx === 'number') {
        const { rows } = await query(
          'SELECT * FROM messages WHERE session_id = $1 AND idx = $2 LIMIT 1',
          [sessionId, idx]
        );
        return rows[0] ? camelizeRow<MessageRow>(rows[0]) : null;
      }
      const order = args.orderBy?.idx === 'asc' ? 'ASC' : 'DESC';
      const { rows } = await query(
        'SELECT * FROM messages WHERE session_id = $1 ORDER BY idx ' + order + ' LIMIT 1',
        [args.where.sessionId]
      );
      return rows[0] ? camelizeRow<MessageRow>(rows[0]) : null;
    },
    async deleteMany(args?: { where?: { sessionId?: string; idx?: number } }) {
      if (args?.where?.sessionId) {
        if (typeof args.where.idx === 'number') {
          console.log(
            `[DB] Deleting single message: sessionId=${args.where.sessionId}, idx=${args.where.idx}`
          );
          await query('DELETE FROM messages WHERE session_id = $1 AND idx = $2', [
            args.where.sessionId,
            args.where.idx,
          ]);
        } else {
          console.log(`[DB] Deleting all messages for session: sessionId=${args.where.sessionId}`);
          await query('DELETE FROM messages WHERE session_id = $1', [args.where.sessionId]);
        }
      } else {
        console.log('[DB] Truncating messages table');
        await query('TRUNCATE TABLE messages');
      }
    },
    async update(args: { where: { sessionId: string; idx: number }; data: { content: string } }) {
      const { sessionId, idx } = args.where;
      const { content } = args.data;
      const { rows } = await query(
        'UPDATE messages SET content = $3 WHERE session_id = $1 AND idx = $2 RETURNING *',
        [sessionId, idx, content]
      );
      return rows[0] ? camelizeRow<MessageRow>(rows[0]) : null;
    },
  },

  characterProfile: {
    async findMany(): Promise<CharacterProfileRow[]> {
      const { rows } = await query('SELECT * FROM character_profiles ORDER BY created_at DESC');
      return rows.map((r) => camelizeRow<CharacterProfileRow>(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<CharacterProfileRow | null> {
      const { rows } = await query('SELECT * FROM character_profiles WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow<CharacterProfileRow>(rows[0]) : null;
    },
    async create(args: {
      data: { id: string; profileJson: string };
    }): Promise<CharacterProfileRow> {
      const { id, profileJson } = args.data;
      const { rows } = await query(
        'INSERT INTO character_profiles (id, profile_json) VALUES ($1, $2::jsonb) RETURNING *',
        [id, profileJson]
      );
      return camelizeRow<CharacterProfileRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { profileJson: string };
    }): Promise<CharacterProfileRow> {
      const { id } = args.where;
      const { profileJson } = args.data;
      const { rows } = await query(
        'UPDATE character_profiles SET profile_json = $2::jsonb, updated_at = now() WHERE id = $1 RETURNING *',
        [id, profileJson]
      );
      return camelizeRow<CharacterProfileRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM character_profiles WHERE id = $1', [args.where.id]);
    },
  },

  // Deprecated alias
  get characterTemplate() {
    return this.characterProfile;
  },

  settingProfile: {
    async findMany(): Promise<SettingProfileRow[]> {
      const { rows } = await query('SELECT * FROM setting_profiles ORDER BY created_at DESC');
      return rows.map((r) => camelizeRow<SettingProfileRow>(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<SettingProfileRow | null> {
      const { rows } = await query('SELECT * FROM setting_profiles WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow<SettingProfileRow>(rows[0]) : null;
    },
    async create(args: { data: { id: string; profileJson: string } }): Promise<SettingProfileRow> {
      const { id, profileJson } = args.data;
      const { rows } = await query(
        'INSERT INTO setting_profiles (id, profile_json) VALUES ($1, $2::jsonb) RETURNING *',
        [id, profileJson]
      );
      return camelizeRow<SettingProfileRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { profileJson: string };
    }): Promise<SettingProfileRow> {
      const { id } = args.where;
      const { profileJson } = args.data;
      const { rows } = await query(
        'UPDATE setting_profiles SET profile_json = $2::jsonb, updated_at = now() WHERE id = $1 RETURNING *',
        [id, profileJson]
      );
      return camelizeRow<SettingProfileRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM setting_profiles WHERE id = $1', [args.where.id]);
    },
  },

  // Deprecated alias
  get settingTemplate() {
    return this.settingProfile;
  },

  personaProfile: {
    async findMany(): Promise<PersonaProfileRow[]> {
      const { rows } = await query('SELECT * FROM persona_profiles ORDER BY created_at DESC');
      return rows.map((r) => camelizeRow<PersonaProfileRow>(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<PersonaProfileRow | null> {
      const { rows } = await query('SELECT * FROM persona_profiles WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow<PersonaProfileRow>(rows[0]) : null;
    },
    async create(args: { data: { id: string; profileJson: string } }): Promise<PersonaProfileRow> {
      const { id, profileJson } = args.data;
      const { rows } = await query(
        'INSERT INTO persona_profiles (id, profile_json) VALUES ($1, $2::jsonb) RETURNING *',
        [id, profileJson]
      );
      return camelizeRow<PersonaProfileRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { profileJson: string };
    }): Promise<PersonaProfileRow> {
      const { id } = args.where;
      const { profileJson } = args.data;
      const { rows } = await query(
        'UPDATE persona_profiles SET profile_json = $2::jsonb, updated_at = now() WHERE id = $1 RETURNING *',
        [id, profileJson]
      );
      return camelizeRow<PersonaProfileRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM persona_profiles WHERE id = $1', [args.where.id]);
    },
  },

  characterInstance: {
    async findUnique(args: {
      where: { id?: string; sessionId?: string; role?: string };
    }): Promise<CharacterInstanceRow | null> {
      if (args.where.id) {
        const { rows } = await query('SELECT * FROM character_instances WHERE id = $1 LIMIT 1', [
          args.where.id,
        ]);
        return rows[0] ? camelizeRow<CharacterInstanceRow>(rows[0]) : null;
      }
      if (args.where.sessionId) {
        const { sessionId, role } = args.where;
        const params: SqlParams = [sessionId];
        let sql = 'SELECT * FROM character_instances WHERE session_id = $1';
        if (role) {
          params.push(role);
          sql += ` AND role = $${params.length}`;
        }
        sql += ' ORDER BY created_at ASC LIMIT 1';
        const { rows } = await query(sql, params);
        return rows[0] ? camelizeRow<CharacterInstanceRow>(rows[0]) : null;
      }
      return null;
    },
    async findMany(args?: {
      where?: { sessionId?: string; templateId?: string; role?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
    }): Promise<CharacterInstanceRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
      }

      if (args?.where?.templateId) {
        params.push(args.where.templateId);
        clauses.push(`template_id = $${params.length}`);
      }

      if (args?.where?.role) {
        params.push(args.where.role);
        clauses.push(`role = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';

      const { rows } = await query(
        `SELECT * FROM character_instances ${where} ORDER BY created_at ${order}`,
        params
      );

      return rows.map((r) => camelizeRow<CharacterInstanceRow>(r));
    },
    async create(args: {
      data: {
        id: string;
        sessionId: string;
        templateId: string;
        templateSnapshot: string;
        profileJson: string;
        overridesJson?: string;
        role?: string;
        label?: string | null;
      };
    }): Promise<CharacterInstanceRow> {
      const d = args.data;
      const { rows } = await query(
        `INSERT INTO character_instances (id, session_id, template_id, template_snapshot, profile_json, overrides_json, role, label)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, COALESCE($6::jsonb, '{}'::jsonb), COALESCE($7, 'primary'), $8)
         RETURNING *`,
        [
          d.id,
          d.sessionId,
          d.templateId,
          d.templateSnapshot,
          d.profileJson,
          d.overridesJson,
          d.role,
          d.label ?? null,
        ]
      );
      return camelizeRow<CharacterInstanceRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { profileJson?: string; overridesJson?: string; role?: string; label?: string | null };
    }): Promise<CharacterInstanceRow> {
      const { id } = args.where;
      const { profileJson, overridesJson, role, label } = args.data;
      const { rows } = await query(
        `UPDATE character_instances
         SET profile_json = COALESCE($2::jsonb, profile_json),
             overrides_json = COALESCE($3::jsonb, overrides_json),
             role = COALESCE($4, role),
             label = COALESCE($5, label),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, profileJson ?? null, overridesJson ?? null, role ?? null, label ?? null]
      );
      return camelizeRow<CharacterInstanceRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM character_instances WHERE id = $1', [args.where.id]);
    },
  },

  settingInstance: {
    async findUnique(args: {
      where: { id?: string; sessionId?: string };
    }): Promise<SettingInstanceRow | null> {
      if (args.where.id) {
        const { rows } = await query('SELECT * FROM setting_instances WHERE id = $1 LIMIT 1', [
          args.where.id,
        ]);
        return rows[0] ? camelizeRow<SettingInstanceRow>(rows[0]) : null;
      }
      if (args.where.sessionId) {
        const { rows } = await query(
          'SELECT * FROM setting_instances WHERE session_id = $1 LIMIT 1',
          [args.where.sessionId]
        );
        return rows[0] ? camelizeRow<SettingInstanceRow>(rows[0]) : null;
      }
      return null;
    },
    async findMany(args?: {
      where?: { sessionId?: string; templateId?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
    }): Promise<SettingInstanceRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
      }

      if (args?.where?.templateId) {
        params.push(args.where.templateId);
        clauses.push(`template_id = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';

      const { rows } = await query(
        `SELECT * FROM setting_instances ${where} ORDER BY created_at ${order}`,
        params
      );

      return rows.map((r) => camelizeRow<SettingInstanceRow>(r));
    },
    async create(args: {
      data: {
        id: string;
        sessionId: string;
        templateId: string;
        templateSnapshot: string;
        profileJson: string;
        overridesJson?: string;
      };
    }): Promise<SettingInstanceRow> {
      const d = args.data;
      const { rows } = await query(
        `INSERT INTO setting_instances (id, session_id, template_id, template_snapshot, profile_json, overrides_json)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, COALESCE($6::jsonb, '{}'::jsonb))
         RETURNING *`,
        [d.id, d.sessionId, d.templateId, d.templateSnapshot, d.profileJson, d.overridesJson]
      );
      return camelizeRow<SettingInstanceRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { profileJson?: string; overridesJson?: string };
    }): Promise<SettingInstanceRow> {
      const { id } = args.where;
      const { profileJson, overridesJson } = args.data;
      const { rows } = await query(
        `UPDATE setting_instances
         SET profile_json = COALESCE($2::jsonb, profile_json),
             overrides_json = COALESCE($3::jsonb, overrides_json),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, profileJson ?? null, overridesJson ?? null]
      );
      return camelizeRow<SettingInstanceRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM setting_instances WHERE id = $1', [args.where.id]);
    },
  },

  itemDefinition: {
    async findMany(args?: {
      where?: { category?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
    }): Promise<ItemDefinitionRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.category) {
        params.push(args.where.category);
        clauses.push(`category = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';

      const { rows } = await query(
        `SELECT * FROM item_definitions ${where} ORDER BY created_at ${order}`,
        params
      );
      return rows.map((r) => camelizeRow<ItemDefinitionRow>(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<ItemDefinitionRow | null> {
      const { rows } = await query('SELECT * FROM item_definitions WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow<ItemDefinitionRow>(rows[0]) : null;
    },
    async create(args: {
      data: { id: string; category: string; definitionJson: string };
    }): Promise<ItemDefinitionRow> {
      const { id, category, definitionJson } = args.data;
      const { rows } = await query(
        'INSERT INTO item_definitions (id, category, definition_json) VALUES ($1, $2, $3::jsonb) RETURNING *',
        [id, category, definitionJson]
      );
      return camelizeRow<ItemDefinitionRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { category?: string; definitionJson?: string };
    }): Promise<ItemDefinitionRow> {
      const { id } = args.where;
      const { category, definitionJson } = args.data;
      const { rows } = await query(
        `UPDATE item_definitions
         SET category = COALESCE($2, category),
             definition_json = COALESCE($3::jsonb, definition_json),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, category ?? null, definitionJson ?? null]
      );
      return camelizeRow<ItemDefinitionRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM item_definitions WHERE id = $1', [args.where.id]);
    },
  },

  itemInstance: {
    async findMany(args?: {
      where?: { sessionId?: string; ownerType?: string; ownerId?: string; definitionId?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
    }): Promise<ItemInstanceRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
      }
      if (args?.where?.ownerType) {
        params.push(args.where.ownerType);
        clauses.push(`owner_type = $${params.length}`);
      }
      if (args?.where?.ownerId) {
        params.push(args.where.ownerId);
        clauses.push(`owner_id = $${params.length}`);
      }
      if (args?.where?.definitionId) {
        params.push(args.where.definitionId);
        clauses.push(`definition_id = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';

      const { rows } = await query(
        `SELECT * FROM item_instances ${where} ORDER BY created_at ${order}`,
        params
      );
      return rows.map((r) => camelizeRow<ItemInstanceRow>(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<ItemInstanceRow | null> {
      const { rows } = await query('SELECT * FROM item_instances WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow<ItemInstanceRow>(rows[0]) : null;
    },
    async create(args: {
      data: {
        id: string;
        sessionId: string;
        definitionId: string;
        definitionSnapshot: string;
        ownerType: string;
        ownerId: string;
      };
    }): Promise<ItemInstanceRow> {
      const d = args.data;
      const { rows } = await query(
        `INSERT INTO item_instances (id, session_id, definition_id, definition_snapshot, owner_type, owner_id)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING *`,
        [d.id, d.sessionId, d.definitionId, d.definitionSnapshot, d.ownerType, d.ownerId]
      );
      return camelizeRow<ItemInstanceRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { ownerType?: string; ownerId?: string };
    }): Promise<ItemInstanceRow> {
      const { id } = args.where;
      const { ownerType, ownerId } = args.data;
      const { rows } = await query(
        `UPDATE item_instances
         SET owner_type = COALESCE($2, owner_type),
             owner_id = COALESCE($3, owner_id),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, ownerType ?? null, ownerId ?? null]
      );
      return camelizeRow<ItemInstanceRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM item_instances WHERE id = $1', [args.where.id]);
    },
  },

  persona: {
    async findMany(args?: {
      where?: { userId?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
    }): Promise<PersonaRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.userId) {
        params.push(args.where.userId);
        clauses.push(`user_id = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';

      const { rows } = await query(
        `SELECT * FROM personas ${where} ORDER BY created_at ${order}`,
        params
      );
      return rows.map((r) => camelizeRow<PersonaRow>(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<PersonaRow | null> {
      const { rows } = await query('SELECT * FROM personas WHERE id = $1 LIMIT 1', [args.where.id]);
      return rows[0] ? camelizeRow<PersonaRow>(rows[0]) : null;
    },
    async create(args: {
      data: { id: string; userId?: string | null; profileJson: string };
    }): Promise<PersonaRow> {
      const { id, userId, profileJson } = args.data;
      const { rows } = await query(
        'INSERT INTO personas (id, user_id, profile_json) VALUES ($1, $2, $3::jsonb) RETURNING *',
        [id, userId ?? null, profileJson]
      );
      return camelizeRow<PersonaRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: { profileJson: string };
    }): Promise<PersonaRow> {
      const { id } = args.where;
      const { profileJson } = args.data;
      const { rows } = await query(
        'UPDATE personas SET profile_json = $2::jsonb, updated_at = now() WHERE id = $1 RETURNING *',
        [id, profileJson]
      );
      return camelizeRow<PersonaRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM personas WHERE id = $1', [args.where.id]);
    },
  },

  sessionPersona: {
    async findMany(args?: {
      where?: { sessionId?: string; personaId?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
    }): Promise<SessionPersonaRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
      }

      if (args?.where?.personaId) {
        params.push(args.where.personaId);
        clauses.push(`persona_id = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';

      const { rows } = await query(
        `SELECT * FROM session_personas ${where} ORDER BY created_at ${order}`,
        params
      );

      return rows.map((r) => camelizeRow<SessionPersonaRow>(r));
    },
    async findUnique(args: { where: { sessionId: string } }): Promise<SessionPersonaRow | null> {
      const { rows } = await query('SELECT * FROM session_personas WHERE session_id = $1 LIMIT 1', [
        args.where.sessionId,
      ]);
      return rows[0] ? camelizeRow<SessionPersonaRow>(rows[0]) : null;
    },
    async create(args: {
      data: {
        sessionId: string;
        personaId: string;
        profileJson: string;
        overridesJson?: string;
      };
    }): Promise<SessionPersonaRow> {
      const { sessionId, personaId, profileJson, overridesJson } = args.data;
      const { rows } = await query(
        `INSERT INTO session_personas (session_id, persona_id, profile_json, overrides_json)
         VALUES ($1, $2, $3::jsonb, COALESCE($4::jsonb, '{}'::jsonb))
         RETURNING *`,
        [sessionId, personaId, profileJson, overridesJson]
      );
      return camelizeRow<SessionPersonaRow>(rows[0]!);
    },
    async update(args: {
      where: { sessionId: string };
      data: { personaId?: string; profileJson?: string; overridesJson?: string };
    }): Promise<SessionPersonaRow> {
      const { sessionId } = args.where;
      const { personaId, profileJson, overridesJson } = args.data;
      const { rows } = await query(
        `UPDATE session_personas
         SET persona_id = COALESCE($2, persona_id),
             profile_json = COALESCE($3::jsonb, profile_json),
             overrides_json = COALESCE($4::jsonb, overrides_json),
             updated_at = now()
         WHERE session_id = $1
         RETURNING *`,
        [sessionId, personaId ?? null, profileJson ?? null, overridesJson ?? null]
      );
      return camelizeRow<SessionPersonaRow>(rows[0]!);
    },
    async delete(args: { where: { sessionId: string } }): Promise<void> {
      await query('DELETE FROM session_personas WHERE session_id = $1', [args.where.sessionId]);
    },
  },

  npcHygieneState: {
    async findMany(args?: {
      where?: { sessionId?: string; npcId?: string; bodyPart?: string };
    }): Promise<NpcHygieneStateRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
      }
      if (args?.where?.npcId) {
        params.push(args.where.npcId);
        clauses.push(`npc_id = $${params.length}`);
      }
      if (args?.where?.bodyPart) {
        params.push(args.where.bodyPart);
        clauses.push(`body_part = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT * FROM npc_hygiene_state ${where} ORDER BY body_part ASC`,
        params
      );
      return rows.map((r) => camelizeRow<NpcHygieneStateRow>(r));
    },
    async findUnique(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
    }): Promise<NpcHygieneStateRow | null> {
      const { sessionId, npcId, bodyPart } = args.where.sessionId_npcId_bodyPart;
      const { rows } = await query(
        'SELECT * FROM npc_hygiene_state WHERE session_id = $1 AND npc_id = $2 AND body_part = $3 LIMIT 1',
        [sessionId, npcId, bodyPart]
      );
      return rows[0] ? camelizeRow<NpcHygieneStateRow>(rows[0]) : null;
    },
    async upsert(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
      create: {
        sessionId: string;
        npcId: string;
        bodyPart: string;
        points: number;
        level: number;
        lastUpdatedAt?: Date;
      };
      update: { points?: number; level?: number; lastUpdatedAt?: Date };
    }): Promise<NpcHygieneStateRow> {
      const { sessionId, npcId, bodyPart } = args.where.sessionId_npcId_bodyPart;
      const { points, level, lastUpdatedAt } = args.create;
      const { rows } = await query(
        `INSERT INTO npc_hygiene_state (session_id, npc_id, body_part, points, level, last_updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id, npc_id, body_part) DO UPDATE SET
           points = COALESCE($7, npc_hygiene_state.points),
           level = COALESCE($8, npc_hygiene_state.level),
           last_updated_at = COALESCE($9, npc_hygiene_state.last_updated_at)
         RETURNING *`,
        [
          sessionId,
          npcId,
          bodyPart,
          points,
          level,
          lastUpdatedAt ?? new Date(),
          args.update.points ?? null,
          args.update.level ?? null,
          args.update.lastUpdatedAt ?? null,
        ]
      );
      return camelizeRow<NpcHygieneStateRow>(rows[0]!);
    },
    async update(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
      data: { points?: number; level?: number; lastUpdatedAt?: Date };
    }): Promise<NpcHygieneStateRow> {
      const { sessionId, npcId, bodyPart } = args.where.sessionId_npcId_bodyPart;
      const { points, level, lastUpdatedAt } = args.data;
      const { rows } = await query(
        `UPDATE npc_hygiene_state SET
           points = COALESCE($4, points),
           level = COALESCE($5, level),
           last_updated_at = COALESCE($6, last_updated_at)
         WHERE session_id = $1 AND npc_id = $2 AND body_part = $3
         RETURNING *`,
        [sessionId, npcId, bodyPart, points ?? null, level ?? null, lastUpdatedAt ?? null]
      );
      return camelizeRow<NpcHygieneStateRow>(rows[0]!);
    },
    async delete(args: {
      where: { sessionId_npcId_bodyPart: { sessionId: string; npcId: string; bodyPart: string } };
    }): Promise<void> {
      const { sessionId, npcId, bodyPart } = args.where.sessionId_npcId_bodyPart;
      await query(
        'DELETE FROM npc_hygiene_state WHERE session_id = $1 AND npc_id = $2 AND body_part = $3',
        [sessionId, npcId, bodyPart]
      );
    },
    async deleteMany(args?: { where?: { sessionId?: string; npcId?: string } }): Promise<void> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
      }
      if (args?.where?.npcId) {
        params.push(args.where.npcId);
        clauses.push(`npc_id = $${params.length}`);
      }

      if (clauses.length > 0) {
        await query(`DELETE FROM npc_hygiene_state WHERE ${clauses.join(' AND ')}`, params);
      } else {
        await query('TRUNCATE TABLE npc_hygiene_state');
      }
    },
  },

  // =========================================================================
  // Schedule Template Operations
  // =========================================================================
  scheduleTemplate: {
    async findMany(args?: { where?: { isSystem?: boolean } }): Promise<ScheduleTemplateRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.isSystem !== undefined) {
        params.push(args.where.isSystem);
        clauses.push(`is_system = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT * FROM schedule_templates ${where} ORDER BY name ASC`,
        params
      );
      return rows.map((r) => camelizeRow<ScheduleTemplateRow>(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<ScheduleTemplateRow | null> {
      const { rows } = await query('SELECT * FROM schedule_templates WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow<ScheduleTemplateRow>(rows[0]) : null;
    },
    async create(args: {
      data: {
        name: string;
        description?: string;
        templateData: unknown;
        requiredPlaceholders: string[];
        isSystem?: boolean;
      };
    }): Promise<ScheduleTemplateRow> {
      const { name, description, templateData, requiredPlaceholders, isSystem } = args.data;
      const { rows } = await query(
        `INSERT INTO schedule_templates (name, description, template_data, required_placeholders, is_system)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          name,
          description ?? null,
          JSON.stringify(templateData),
          requiredPlaceholders,
          isSystem ?? false,
        ]
      );
      return camelizeRow<ScheduleTemplateRow>(rows[0]!);
    },
    async update(args: {
      where: { id: string };
      data: {
        name?: string;
        description?: string;
        templateData?: unknown;
        requiredPlaceholders?: string[];
      };
    }): Promise<ScheduleTemplateRow> {
      const { id } = args.where;
      const { name, description, templateData, requiredPlaceholders } = args.data;
      const { rows } = await query(
        `UPDATE schedule_templates SET
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           template_data = COALESCE($4, template_data),
           required_placeholders = COALESCE($5, required_placeholders)
         WHERE id = $1 AND is_system = FALSE
         RETURNING *`,
        [
          id,
          name ?? null,
          description ?? null,
          templateData ? JSON.stringify(templateData) : null,
          requiredPlaceholders ?? null,
        ]
      );
      return camelizeRow<ScheduleTemplateRow>(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      // Only allow deletion of non-system templates
      await query('DELETE FROM schedule_templates WHERE id = $1 AND is_system = FALSE', [
        args.where.id,
      ]);
    },
  },

  // =========================================================================
  // NPC Schedule Operations
  // =========================================================================
  npcSchedule: {
    async findMany(args?: {
      where?: { sessionId?: string; npcId?: string };
    }): Promise<NpcScheduleRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
      }
      if (args?.where?.npcId) {
        params.push(args.where.npcId);
        clauses.push(`npc_id = $${params.length}`);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT * FROM npc_schedules ${where} ORDER BY npc_id ASC`,
        params
      );
      return rows.map((r) => camelizeRow<NpcScheduleRow>(r));
    },
    async findUnique(args: {
      where: { sessionId_npcId: { sessionId: string; npcId: string } };
    }): Promise<NpcScheduleRow | null> {
      const { sessionId, npcId } = args.where.sessionId_npcId;
      const { rows } = await query(
        'SELECT * FROM npc_schedules WHERE session_id = $1 AND npc_id = $2 LIMIT 1',
        [sessionId, npcId]
      );
      return rows[0] ? camelizeRow<NpcScheduleRow>(rows[0]) : null;
    },
    async upsert(args: {
      where: { sessionId_npcId: { sessionId: string; npcId: string } };
      create: {
        sessionId: string;
        npcId: string;
        templateId?: string;
        scheduleData: unknown;
        placeholderMappings?: unknown;
      };
      update: {
        templateId?: string;
        scheduleData?: unknown;
        placeholderMappings?: unknown;
      };
    }): Promise<NpcScheduleRow> {
      const { sessionId, npcId } = args.where.sessionId_npcId;
      const { templateId, scheduleData, placeholderMappings } = args.create;
      const { rows } = await query(
        `INSERT INTO npc_schedules (session_id, npc_id, template_id, schedule_data, placeholder_mappings)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id, npc_id) DO UPDATE SET
           template_id = COALESCE($6, npc_schedules.template_id),
           schedule_data = COALESCE($7, npc_schedules.schedule_data),
           placeholder_mappings = COALESCE($8, npc_schedules.placeholder_mappings)
         RETURNING *`,
        [
          sessionId,
          npcId,
          templateId ?? null,
          JSON.stringify(scheduleData),
          placeholderMappings ? JSON.stringify(placeholderMappings) : null,
          args.update.templateId ?? null,
          args.update.scheduleData ? JSON.stringify(args.update.scheduleData) : null,
          args.update.placeholderMappings ? JSON.stringify(args.update.placeholderMappings) : null,
        ]
      );
      return camelizeRow<NpcScheduleRow>(rows[0]!);
    },
    async delete(args: {
      where: { sessionId_npcId: { sessionId: string; npcId: string } };
    }): Promise<void> {
      const { sessionId, npcId } = args.where.sessionId_npcId;
      await query('DELETE FROM npc_schedules WHERE session_id = $1 AND npc_id = $2', [
        sessionId,
        npcId,
      ]);
    },
    async deleteMany(args?: { where?: { sessionId?: string } }): Promise<void> {
      if (args?.where?.sessionId) {
        await query('DELETE FROM npc_schedules WHERE session_id = $1', [args.where.sessionId]);
      } else {
        await query('TRUNCATE TABLE npc_schedules');
      }
    },
  },
};
