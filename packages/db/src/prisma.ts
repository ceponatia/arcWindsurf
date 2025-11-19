import { Pool } from 'pg';
import { registerType } from './pgvector.js';
import type { DbRow, DbRows, QueryResult, SqlParams, PgPoolStrict, PgClientLike } from './types.js';

const env: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env ?? {};

export const resolvedDbUrl =
  env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/minirpg';
export const resolvedDbPath = resolvedDbUrl;

// Create a shared connection pool without relying on pg typings
function createPool(url: string): unknown {
  const Ctor = Pool as unknown as new (config: { connectionString: string }) => unknown;
  return new Ctor({ connectionString: url });
}
const rawPool = createPool(resolvedDbUrl);
(registerType as (p: unknown) => void)(rawPool);
export const pool: PgPoolStrict = rawPool as PgPoolStrict;

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

function camelizeRow(row: DbRow): DbRow {
  const out: DbRow = {};
  for (const k of Object.keys(row)) {
    const v = (row as Record<string, unknown>)[k];
    const ck = k.replace(/_[a-z]/g, (m) => m[1]!.toUpperCase());
    if (ck === 'createdAt' || ck === 'updatedAt') {
      (out as Record<string, unknown>)[ck] = asDate(v) ?? undefined;
    } else if (ck === 'profileJson' && typeof v === 'object' && v !== null) {
      // return stringified JSON to match previous Prisma shape
      (out as Record<string, unknown>)[ck] = JSON.stringify(v);
    } else {
      (out as Record<string, unknown>)[ck] = v;
    }
  }
  return out;
}

export const prisma = {
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
      create: { id: string; characterId: string; settingId: string };
      update: { characterId: string; settingId: string };
    }) {
      const { id } = args.where;
      const { characterId, settingId } = args.create;
      const { rows } = await query(
        `INSERT INTO user_sessions (id, character_id, setting_id) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET character_id = EXCLUDED.character_id, setting_id = EXCLUDED.setting_id, updated_at = now()
         RETURNING *`,
        [id, characterId, settingId]
      );
      return camelizeRow(rows[0]!);
    },
    async findUnique(args: {
      where: { id: string };
      include?: { messages?: { orderBy?: { idx?: 'asc' | 'desc' } } };
    }) {
      const { id } = args.where;
      const { rows } = await query('SELECT * FROM user_sessions WHERE id = $1 LIMIT 1', [id]);
      if (rows.length === 0) return null;
      const base = camelizeRow(rows[0]!);
      if (args.include?.messages) {
        const order = args.include.messages.orderBy?.idx === 'asc' ? 'ASC' : 'DESC';
        const mres = await query(
          'SELECT * FROM messages WHERE session_id = $1 ORDER BY idx ' + order,
          [id]
        );
        base['messages'] = mres.rows.map((r) => camelizeRow(r));
      }
      return base;
    },
    async findMany(args?: { orderBy?: { createdAt?: 'asc' | 'desc' } }) {
      const order = args?.orderBy?.createdAt === 'asc' ? 'ASC' : 'DESC';
      const { rows } = await query('SELECT * FROM user_sessions ORDER BY created_at ' + order);
      return rows.map((r) => camelizeRow(r));
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
    }) {
      const { id, sessionId, idx, role, content } = args.data;
      const { rows } = await query(
        'INSERT INTO messages (id, session_id, idx, role, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, sessionId, idx, role, content]
      );
      return camelizeRow(rows[0]!);
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
    async findFirst(args: { where: { sessionId: string }; orderBy?: { idx?: 'asc' | 'desc' } }) {
      const order = args.orderBy?.idx === 'asc' ? 'ASC' : 'DESC';
      const { rows } = await query(
        'SELECT * FROM messages WHERE session_id = $1 ORDER BY idx ' + order + ' LIMIT 1',
        [args.where.sessionId]
      );
      return rows[0] ? camelizeRow(rows[0]) : null;
    },
    async deleteMany(args?: { where?: { sessionId?: string } }) {
      if (args?.where?.sessionId) {
        await query('DELETE FROM messages WHERE session_id = $1', [args.where.sessionId]);
      } else {
        await query('TRUNCATE TABLE messages');
      }
    },
  },

  characterTemplate: {
    async findMany(): Promise<DbRows> {
      const { rows } = await query('SELECT * FROM character_templates ORDER BY created_at DESC');
      return rows.map((r) => camelizeRow(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<DbRow | null> {
      const { rows } = await query('SELECT * FROM character_templates WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow(rows[0]) : null;
    },
    async create(args: { data: { id: string; profileJson: string } }): Promise<DbRow> {
      const { id, profileJson } = args.data;
      const { rows } = await query(
        'INSERT INTO character_templates (id, profile_json) VALUES ($1, $2::jsonb) RETURNING *',
        [id, profileJson]
      );
      return camelizeRow(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM character_templates WHERE id = $1', [args.where.id]);
    },
  },

  settingTemplate: {
    async findMany(): Promise<DbRows> {
      const { rows } = await query('SELECT * FROM setting_templates ORDER BY created_at DESC');
      return rows.map((r) => camelizeRow(r));
    },
    async findUnique(args: { where: { id: string } }): Promise<DbRow | null> {
      const { rows } = await query('SELECT * FROM setting_templates WHERE id = $1 LIMIT 1', [
        args.where.id,
      ]);
      return rows[0] ? camelizeRow(rows[0]) : null;
    },
    async create(args: { data: { id: string; profileJson: string } }): Promise<DbRow> {
      const { id, profileJson } = args.data;
      const { rows } = await query(
        'INSERT INTO setting_templates (id, profile_json) VALUES ($1, $2::jsonb) RETURNING *',
        [id, profileJson]
      );
      return camelizeRow(rows[0]!);
    },
    async delete(args: { where: { id: string } }): Promise<void> {
      await query('DELETE FROM setting_templates WHERE id = $1', [args.where.id]);
    },
  },

  characterInstance: {
    async findUnique(args: {
      where: {
        sessionId_templateCharacterId?: { sessionId: string; templateCharacterId: string };
        id?: string;
      };
    }): Promise<DbRow | null> {
      if (args.where.id) {
        const { rows } = await query('SELECT * FROM character_instances WHERE id = $1 LIMIT 1', [
          args.where.id,
        ]);
        return rows[0] ? camelizeRow(rows[0]) : null;
      }
      const key = args.where.sessionId_templateCharacterId!;
      const { rows } = await query(
        'SELECT * FROM character_instances WHERE session_id = $1 AND template_character_id = $2 LIMIT 1',
        [key.sessionId, key.templateCharacterId]
      );
      return rows[0] ? camelizeRow(rows[0]) : null;
    },
    async create(args: {
      data: {
        id: string;
        sessionId: string;
        templateCharacterId: string;
        baseline: string;
        overrides: string;
      };
    }): Promise<DbRow> {
      const d = args.data;
      const { rows } = await query(
        'INSERT INTO character_instances (id, session_id, template_character_id, baseline, overrides) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb) RETURNING *',
        [d.id, d.sessionId, d.templateCharacterId, d.baseline, d.overrides]
      );
      return camelizeRow(rows[0]!);
    },
    async update(args: { where: { id: string }; data: { overrides?: string } }): Promise<DbRow> {
      const { id } = args.where;
      const { overrides } = args.data;
      const { rows } = await query(
        'UPDATE character_instances SET overrides = COALESCE($2::jsonb, overrides), updated_at = now() WHERE id = $1 RETURNING *',
        [id, overrides ?? null]
      );
      return camelizeRow(rows[0]!);
    },
  },

  settingInstance: {
    async findUnique(args: {
      where: {
        sessionId_templateSettingId?: { sessionId: string; templateSettingId: string };
        id?: string;
      };
    }): Promise<DbRow | null> {
      if (args.where.id) {
        const { rows } = await query('SELECT * FROM setting_instances WHERE id = $1 LIMIT 1', [
          args.where.id,
        ]);
        return rows[0] ? camelizeRow(rows[0]) : null;
      }
      const key = args.where.sessionId_templateSettingId!;
      const { rows } = await query(
        'SELECT * FROM setting_instances WHERE session_id = $1 AND template_setting_id = $2 LIMIT 1',
        [key.sessionId, key.templateSettingId]
      );
      return rows[0] ? camelizeRow(rows[0]) : null;
    },
    async create(args: {
      data: {
        id: string;
        sessionId: string;
        templateSettingId: string;
        baseline: string;
        overrides: string;
      };
    }): Promise<DbRow> {
      const d = args.data;
      const { rows } = await query(
        'INSERT INTO setting_instances (id, session_id, template_setting_id, baseline, overrides) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb) RETURNING *',
        [d.id, d.sessionId, d.templateSettingId, d.baseline, d.overrides]
      );
      return camelizeRow(rows[0]!);
    },
    async update(args: { where: { id: string }; data: { overrides?: string } }): Promise<DbRow> {
      const { id } = args.where;
      const { overrides } = args.data;
      const { rows } = await query(
        'UPDATE setting_instances SET overrides = COALESCE($2::jsonb, overrides), updated_at = now() WHERE id = $1 RETURNING *',
        [id, overrides ?? null]
      );
      return camelizeRow(rows[0]!);
    },
  },
};
