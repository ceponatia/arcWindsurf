import { PrismaClient } from '@prisma/client'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

// Resolve a stable, absolute SQLite URL pointing to packages/api/prisma/dev.db
function toPrismaFileUrl(urlOrConn: string): string {
  if (urlOrConn.startsWith('file://')) {
    const absPath = fileURLToPath(urlOrConn)
    return `file:${absPath}`
  }
  return urlOrConn
}

function resolveDbUrl(): string {
  const envUrl = process.env.DATABASE_URL
  // Absolute file URL provided -> use as-is
  if (envUrl?.startsWith('file://')) return toPrismaFileUrl(envUrl)
  // Relative file path via file:./ or file:../ -> resolve relative to this file (packages/api/src/db)
  if (envUrl?.startsWith('file:')) {
    const rel = envUrl.slice('file:'.length)
    // Resolve relative to the API package root (../../ from this file)
    const apiRoot = fileURLToPath(new URL('../../', import.meta.url))
    const absPath = path.resolve(apiRoot, rel)
    return toPrismaFileUrl(pathToFileURL(absPath).href)
  }
  // Default to local dev DB at ../../prisma/dev.db (from src/db/prisma.ts)
  return toPrismaFileUrl(new URL('../../prisma/dev.db', import.meta.url).href)
}

const dbUrl = resolveDbUrl()
process.env.DATABASE_URL = dbUrl
export const resolvedDbUrl = dbUrl
export const resolvedDbPath = dbUrl.startsWith('file:') ? dbUrl.replace(/^file:/, '') : dbUrl
// Log the resolved DB URL once at import time
if (process.env.NODE_ENV !== 'test') {
  console.log(`[prisma] datasource url -> ${dbUrl}`)
}

// Ensure a single PrismaClient across hot-reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
