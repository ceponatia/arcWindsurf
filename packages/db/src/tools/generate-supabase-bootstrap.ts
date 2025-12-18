import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Generates a single SQL file suitable for applying to a fresh Supabase database.
 *
 * It concatenates every file in `packages/db/sql/*.sql` in lexicographic order.
 *
 * This does not replace incremental migrations; it is a convenience for first-time
 * bootstrap in environments like Supabase's SQL editor.
 */
export async function generateSupabaseBootstrapSql(options?: {
  outputPath?: string;
}): Promise<{ outputPath: string; fileCount: number }> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const sqlDir = path.resolve(__dirname, '../../sql');
  const outputPath = options?.outputPath ?? path.resolve(sqlDir, 'supabase_bootstrap.sql');

  const files = (await fs.readdir(sqlDir)).filter((f) => f.toLowerCase().endsWith('.sql')).sort();

  const header = `-- Minimal RPG: Supabase bootstrap SQL\n--\n-- Generated from packages/db/sql/*.sql\n-- DO NOT EDIT BY HAND; re-generate via: pnpm -F @minimal-rpg/db db:bootstrap:supabase\n\n`;
  const extensionPreamble = `-- Ensure required extensions exist\nCREATE EXTENSION IF NOT EXISTS vector;\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\n\n`;

  const parts: string[] = [header, extensionPreamble];

  for (const fileName of files) {
    const fullPath = path.join(sqlDir, fileName);
    const sql = await fs.readFile(fullPath, 'utf8');
    parts.push(
      `-- -----------------------------------------------------------------------------\n-- BEGIN ${fileName}\n-- -----------------------------------------------------------------------------\n`
    );
    parts.push(sql.trimEnd());
    parts.push(
      `\n\n-- -----------------------------------------------------------------------------\n-- END ${fileName}\n-- -----------------------------------------------------------------------------\n\n`
    );
  }

  await fs.writeFile(outputPath, parts.join(''), 'utf8');
  return { outputPath, fileCount: files.length };
}

// CLI usage
if (import.meta.url === new URL(process.argv[1] ?? '', 'file:').href) {
  const outArgIndex = process.argv.indexOf('--out');
  const outputPath = outArgIndex >= 0 ? process.argv[outArgIndex + 1] : undefined;

  generateSupabaseBootstrapSql({ outputPath })
    .then(({ outputPath: out, fileCount }) => {
      // eslint-disable-next-line no-console
      console.log(`[db] Wrote ${fileCount} migrations to ${out}`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[db] Failed to generate bootstrap SQL:', err);
      process.exit(1);
    });
}
