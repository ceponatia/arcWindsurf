import { PrismaClient } from '@prisma/client'

// Default DATABASE_URL for local dev if not provided
process.env.DATABASE_URL ??= 'file:./prisma/dev.db'

// Ensure a single PrismaClient across hot-reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
