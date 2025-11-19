import { pool } from './prisma.js';

async function run() {
  // No-op seed. Add demo data here if needed.
  await pool.end();
}

run().catch((err: unknown) => {
  const isError = err instanceof Error;
  const message = isError ? err.message : String(err);
  console.error('[db] Seed failed:', message);
  // Re-throw to ensure non-zero exit without relying on global process typings
  throw isError ? err : new Error(message);
});
