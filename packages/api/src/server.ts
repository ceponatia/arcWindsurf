// IMPORTANT: This file is an entrypoint.
// Under Node ESM, static imports are evaluated before any code in this module.
// That means we must load `.env` BEFORE importing the rest of the app
// (especially @minimal-rpg/db, which resolves DATABASE_URL at module init).

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFiles(): void {
  const repoRootEnvPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: repoRootEnvPath });
}

loadEnvFiles();

const { startServer } = await import('./serverImpl.js');
void startServer();
