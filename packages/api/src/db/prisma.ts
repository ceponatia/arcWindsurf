import { PrismaClient } from '@prisma/client'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

function toPrismaFileUrl(urlOrConn: string): string {
  if (urlOrConn.startsWith('file://')) {
    const absPath = fileURLToPath(urlOrConn)
    return `file:${absPath}`
  }
  return urlOrConn
}

function resolveDbUrl(): string {
  const envUrl = process.env.DATABASE_URL

  if (envUrl?.startsWith('file://')) return toPrismaFileUrl(envUrl)

  if (envUrl?.startsWith('file:')) {
    const rel = envUrl.slice('file:'.length)
    const apiRoot = fileURLToPath(new URL('../../', import.meta.url))
    const absPath = path.resolve(apiRoot, rel)
    return toPrismaFileUrl(pathToFileURL(absPath).href)
  }

  return toPrismaFileUrl(new URL('../../prisma/dev.db', import.meta.url).href)
}

const dbUrl = resolveDbUrl()
process.env.DATABASE_URL = dbUrl

export const resolvedDbUrl = dbUrl
export const resolvedDbPath = dbUrl.startsWith('file:')
  ? dbUrl.replace(/^file:/, '')
  : dbUrl

if (process.env.NODE_ENV !== 'test') {
  console.log(`[prisma] datasource url -> ${dbUrl}`)
}

// One client per process – totally fine for a Node API
export const prisma = new PrismaClient()