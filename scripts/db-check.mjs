import { Client } from 'pg';
const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/minirpg';
const client = new Client({ connectionString: url });
try {
  await client.connect();
  const s = await client.query('SELECT COUNT(*)::int AS count FROM user_sessions');
  const m = await client.query('SELECT COUNT(*)::int AS count FROM messages');
  console.log(JSON.stringify({ url, sessions: Number(s.rows[0]?.count || 0), messages: Number(m.rows[0]?.count || 0) }));
} catch (e) {
  console.error('error', e?.message || e);
  process.exit(1);
} finally {
  await client.end();
}
