import { db, resolvedDbUrl, pool } from './client.js';
import type {
  DbColumn,
  DbOverviewResult,
  DbPathInfo,
  DbRow as Row,
  DbTableOverview,
  QueryResult,
} from './types.js';

export type DbRow = Row;

export async function getDbOverview(): Promise<DbOverviewResult> {
  // Introspect selected tables in public schema
  const tableNames = [
    'user_sessions',
    'messages',
    'character_instances',
    'setting_instances',
    'character_profiles',
    'setting_profiles',
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

    const name = t
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');

    results.push({ name, columns, rowCount, sample });
  }

  return { tables: results };
}

export async function getDbPathInfo(): Promise<DbPathInfo> {
  // For Postgres, there's no local file path; perform a simple connectivity check
  let exists = false;
  try {
    await db.$queryRaw`SELECT 1`;
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
    characterprofile: 'character_profiles',
    characterprofiles: 'character_profiles',
    settingprofile: 'setting_profiles',
    settingprofiles: 'setting_profiles',
    // Legacy mappings
    charactertemplate: 'character_profiles',
    charactertemplates: 'character_profiles',
    settingtemplate: 'setting_profiles',
    settingtemplates: 'setting_profiles',
  };
  const key = modelName.toLowerCase();
  const table = map[key];
  if (!table) throw new Error('Unknown model');

  const res: QueryResult<DbRow> = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  // rowCount not reliable across some drivers, but pg supports it
  if ((res.rowCount ?? 0) === 0) throw new Error('Not found');
}
