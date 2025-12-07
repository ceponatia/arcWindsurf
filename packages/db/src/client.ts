import { Pool } from 'pg';
import { registerType } from './pgvector.js';
import type {
  CharacterInstanceRow,
  CharacterTemplateRow,
  CharacterProfileRow,
  SettingProfileRow,
  DbRow,
  DbRows,
  ItemDefinitionRow,
  ItemInstanceRow,
  MessageRow,
  PgClientLike,
  PgPoolStrict,
  QueryResult,
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
      where?: { sessionId?: string; role?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
    }): Promise<CharacterInstanceRow[]> {
      const clauses: string[] = [];
      const params: SqlParams = [];

      if (args?.where?.sessionId) {
        params.push(args.where.sessionId);
        clauses.push(`session_id = $${params.length}`);
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
};
