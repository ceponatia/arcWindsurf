import { PrismaClient } from '@prisma/client'

// Resolve a stable, absolute SQLite URL pointing to packages/api/prisma/dev.db
function resolveDbUrl(): string {
  const envUrl = process.env.DATABASE_URL
  // Absolute file URL provided -> use as-is
  if (envUrl && envUrl.startsWith('file://')) return envUrl
  // Relative file path via file:./ or file:../ -> resolve relative to this file (packages/api/src/db)
  if (envUrl && envUrl.startsWith('file:')) {
    const rel = envUrl.slice('file:'.length)
    try {
      const url = new URL(rel, import.meta.url)
      return url.href
    } catch {
      // fall through to default
    }
  }
  // Default to local dev DB at ../../prisma/dev.db (from src/db/prisma.ts)
  return new URL('../../prisma/dev.db', import.meta.url).href
}

const dbUrl = resolveDbUrl()
// Log the resolved DB URL once at import time
if (process.env.NODE_ENV !== 'test') {
  console.log(`[prisma] datasource url -> ${dbUrl}`)
}

// Ensure a single PrismaClient across hot-reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasources: { db: { url: dbUrl } } })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
