import { prisma, resolvedDbUrl, pool } from './prisma.js';
import type { DbRow as Row, QueryResult } from './types.js';

export interface DbColumn {
  name: string;
  type: string;
  isId: boolean;
  isRequired: boolean;
  isList: boolean;
}

export type DbRow = Row;

export interface DbTableOverview {
  name: string;
  columns: DbColumn[];
  rowCount: number;
  sample: DbRow[];
}

export async function getDbOverview(): Promise<{ tables: DbTableOverview[] }> {
  // Introspect selected tables in public schema
  const tableNames = [
    'user_sessions',
    'messages',
    'character_instances',
    'setting_instances',
    'character_templates',
    'setting_templates',
  ];

  const results: DbTableOverview[] = [];

  for (const t of tableNames) {
    const colsRes = await pool.query(
      `SELECT c.column_name, c.is_nullable, c.data_type
       FROM information_schema.columns c
       WHERE c.table_schema = 'public' AND c.table_name = $1
       ORDER BY c.ordinal_position`,
      [t]
    );
    const columns: DbColumn[] = colsRes.rows.map((r) => {
      const rec = r as Record<string, unknown>;
      const name = String(rec['column_name']);
      const type = String(rec['data_type']);
      const isNullable = String(rec['is_nullable']);
      return {
        name,
        type,
        isId: name === 'id',
        isRequired: isNullable === 'NO',
        isList: false,
      };
    });

    const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM ${t}`);
    const rowCount = Number((countRes.rows[0] as Record<string, unknown>)?.['count'] ?? 0);

    const hasCreatedAt = columns.some((c) => c.name === 'created_at');
    const order = hasCreatedAt ? 'ORDER BY created_at DESC' : '';
    const sampleRes: QueryResult<DbRow> = await pool.query(`SELECT * FROM ${t} ${order} LIMIT 50`);
    const sample: DbRow[] = sampleRes.rows;

    // Present camelCase table name similar to Prisma model for UI consistency
    const name = t
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');

    results.push({ name, columns, rowCount, sample });
  }

  return { tables: results };
}

export async function getDbPathInfo() {
  // For Postgres, there's no local file path; perform a simple connectivity check
  let exists = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    exists = true;
  } catch {
    // Connectivity check failed; exists remains false
  }
  return { url: resolvedDbUrl, path: resolvedDbUrl, exists };
}

export async function deleteDbRow(modelName: string, id: string): Promise<void> {
  const map: Record<string, string> = {
    usersession: 'user_sessions',
    usersessions: 'user_sessions',
    message: 'messages',
    messages: 'messages',
    characterinstance: 'character_instances',
    characterinstances: 'character_instances',
    settinginstance: 'setting_instances',
    settinginstances: 'setting_instances',
    charactertemplate: 'character_templates',
    charactertemplates: 'character_templates',
    settingtemplate: 'setting_templates',
    settingtemplates: 'setting_templates',
  };
  const key = modelName.toLowerCase();
  const table = map[key];
  if (!table) throw new Error('Unknown model');

  const res: QueryResult<DbRow> = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  // rowCount not reliable across some drivers, but pg supports it
  if ((res.rowCount ?? 0) === 0) throw new Error('Not found');
}
