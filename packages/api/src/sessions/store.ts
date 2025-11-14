import { randomUUID } from 'node:crypto'
import { prisma } from '../db/prisma.js'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  role: MessageRole
  content: string
  createdAt: string
}

export interface Session {
  id: string
  characterId: string
  settingId: string
  createdAt: string
  messages: Message[]
}

export interface SessionSummary {
  id: string
  characterId: string
  settingId: string
  createdAt: string
}

export async function createSession(id: string, characterId: string, settingId: string): Promise<Session> {
  const created = await prisma.userSession.upsert({
    where: { id },
    create: { id, characterId, settingId },
    update: { characterId, settingId },
  })
  return { id: created.id, characterId, settingId, createdAt: created.createdAt.toISOString(), messages: [] }
}

export async function getSession(id: string): Promise<Session | undefined> {
  const s = await prisma.userSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { idx: 'asc' } } },
  })
  if (!s) return undefined
  const messages: Message[] = s.messages.map((m) => ({
    role: m.role as MessageRole,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }))
  return { id: s.id, characterId: s.characterId, settingId: s.settingId, createdAt: s.createdAt.toISOString(), messages }
}

export async function listSessions(): Promise<SessionSummary[]> {
  const rows = await prisma.userSession.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map((r) => ({ id: r.id, characterId: r.characterId, settingId: r.settingId, createdAt: r.createdAt.toISOString() }))
}

export async function clearSessions() {
  await prisma.message.deleteMany({})
  await prisma.userSession.deleteMany({})
}

export async function appendMessage(sessionId: string, role: MessageRole, content: string) {
  // Determine next idx for the session
  const last = await prisma.message.findFirst({ where: { sessionId }, orderBy: { idx: 'desc' } })
  const nextIdx = (last?.idx ?? 0) + 1
	await prisma.message.create({ data: { id: randomUUID(), sessionId, idx: nextIdx, role, content } })
}
