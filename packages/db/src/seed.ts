import { pool } from './client.js';
import { seedBuiltInTags } from './seeds/built-in-tags.js';

async function run() {
  console.log('[db] Running seeds...');

  // Seed built-in tags
  await seedBuiltInTags(pool);

  console.log('[db] Seeds complete.');
  await pool.end();
}

run().catch((err: unknown) => {
  const isError = err instanceof Error;
  const message = isError ? err.message : String(err);
  console.error('[db] Seed failed:', message);
  // Re-throw to ensure non-zero exit without relying on global process typings
  throw isError ? err : new Error(message);
});
