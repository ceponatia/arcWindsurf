import { pool } from './utils/client.js';
import { seedBuiltInTags } from './seeds/built-in-tags.js';
import { seedTestEntities } from './seeds/test-entities.js';
import type { BuiltInTagSeedMode } from './seeds/built-in-tags.js';

/**
 * Parse seed CLI args.
 * Supported:
 * - `--mode insert|upsert`
 * - `--upsert` (alias for `--mode upsert`)
 */
function parseSeedArgs(argv: string[]): {
  builtInTagsMode: BuiltInTagSeedMode;
  includeTestEntities: boolean;
} {
  let builtInTagsMode: BuiltInTagSeedMode = 'insert';
  let includeTestEntities = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (a === '--upsert') {
      builtInTagsMode = 'upsert';
      continue;
    }

    if (a === '--mode') {
      const v = argv[i + 1];
      if (v === 'insert' || v === 'upsert') {
        builtInTagsMode = v;
        i++;
      }
      continue;
    }

    if (a.startsWith('--mode=')) {
      const v = a.slice('--mode='.length);
      if (v === 'insert' || v === 'upsert') {
        builtInTagsMode = v;
      }
    }

    if (a === '--test-entities' || a === '--seed-test-entities') {
      includeTestEntities = true;
    }
  }

  return { builtInTagsMode, includeTestEntities };
}

async function run() {
  const { builtInTagsMode, includeTestEntities } = parseSeedArgs(
    (globalThis as unknown as { process?: { argv?: string[] } }).process?.argv ?? []
  );
  console.log('[db] Running seeds...');

  // Seed built-in tags
  await seedBuiltInTags(pool, { mode: builtInTagsMode });

  // Seed test entities (setting + character + location map)
  if (includeTestEntities) {
    await seedTestEntities(pool, { mode: builtInTagsMode });
  }

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
