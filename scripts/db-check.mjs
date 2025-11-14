import { PrismaClient } from '@prisma/client'
const url = 'file:///home/brian/projects/minimal-rpg/packages/api/prisma/dev.db'
const prisma = new PrismaClient({ datasources: { db: { url } } })
try {
  const sessions = await prisma.userSession.count()
  const messages = await prisma.message.count()
  console.log(JSON.stringify({ url, sessions, messages }))
} catch (e) {
  console.error('error', e?.message || e)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
