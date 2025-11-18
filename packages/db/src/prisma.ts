import { PrismaClient } from '@prisma/client';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Narrowed view of process.env for Prisma
interface PrismaEnv extends NodeJS.ProcessEnv {
  DATABASE_URL?: string;
  NODE_ENV?: string;
}

const env = process.env as PrismaEnv;

function toPrismaFileUrl(urlOrConn: string): string {
  if (urlOrConn.startsWith('file://')) {
    const absPath = fileURLToPath(urlOrConn);
    return `file:${absPath}`;
  }
  return urlOrConn;
}

function defaultDevDbUrl(): string {
  // ../prisma/dev.db relative to this file (packages/db/src/node.ts)
  const devDbUrl = new URL('../prisma/dev.db', import.meta.url).href;
  return toPrismaFileUrl(devDbUrl);
}

function resolveDbUrl(): string {
  const envUrl = env.DATABASE_URL;

  // If no env DATABASE_URL, fall back to local dev DB file
  if (!envUrl) {
    return defaultDevDbUrl();
  }

  // Absolute file URL provided -> use as-is, normalized
  if (envUrl.startsWith('file://')) {
    return toPrismaFileUrl(envUrl);
  }

  // Relative file path via file:./ or file:../ -> resolve relative to the prisma schema directory (packages/db/prisma)
  if (envUrl.startsWith('file:')) {
    const rel = envUrl.slice('file:'.length);
    const prismaDir = fileURLToPath(new URL('../prisma/', import.meta.url)); // packages/db/prisma/
    const absPath = path.resolve(prismaDir, rel);
    return toPrismaFileUrl(pathToFileURL(absPath).href);
  }

  // Any other kind of connection string (e.g. postgres://...) -> leave it alone
  return envUrl;
}

const dbUrl = resolveDbUrl();

// keep env and process.env in sync (same underlying object)
env.DATABASE_URL = dbUrl;

export const resolvedDbUrl = dbUrl;
export const resolvedDbPath = dbUrl.startsWith('file:') ? dbUrl.replace(/^file:/, '') : dbUrl;

if (env.NODE_ENV !== 'test') {
  console.log(`[prisma] datasource url -> ${dbUrl}`);
}

// One client per process – totally fine for a Node API
export const prisma = new PrismaClient();
