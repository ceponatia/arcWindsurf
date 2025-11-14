#!/usr/bin/env node
// Core startup orchestration for Minimal RPG
// Policy: warn if Ollama unreachable; do not attempt to start it.
// Uses Prisma migrations via db:deploy then seed.
// Cross-platform (pure Node) port checks.

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { PrismaClient } from '@prisma/client'

const ROOT = process.cwd()
const CORE_DIR = path.join(ROOT, '.core')
const API_PORT = Number(process.env.PORT || 3001)
const WEB_PORT = 5173
const OLLAMA_PORT = 11434
const START_TIMEOUT_MS = 60_000
const HEALTH_POLL_INTERVAL_MS = 2_000
const DEFAULT_DB_FILE = path.join(ROOT, 'packages/api/prisma/dev.db')
const DEFAULT_DB_URL = process.env.DATABASE_URL || pathToFileURL(DEFAULT_DB_FILE).href
const prisma = new PrismaClient({ datasources: { db: { url: DEFAULT_DB_URL } } })

async function ensureCoreDir() {
  await fs.mkdir(CORE_DIR, { recursive: true })
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(1500)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => { socket.destroy(); resolve(false) })
    socket.connect(port, '127.0.0.1')
  })
}

async function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const { env, ...rest } = opts
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env }, ...rest })
    child.on('exit', (code) => {
      if (code === 0) resolve(0)
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

function spawnDetached(name, cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  return child.pid
}

async function writePid(name, pid) {
  const file = path.join(CORE_DIR, `${name}.pid`)
  await fs.writeFile(file, String(pid))
}

async function readJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.setTimeout(4000, () => { req.destroy(new Error('timeout')) })
  })
}

async function pollHealth() {
  const start = Date.now()
  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const h = await readJson(`http://localhost:${API_PORT}/health`)
      if (h && h.status) return h
    } catch {}
    await new Promise(r => setTimeout(r, HEALTH_POLL_INTERVAL_MS))
  }
  throw new Error('Timed out waiting for /health')
}

async function dbCompleteness() {
  try {
    const sessionCount = await prisma.userSession.count()
    const messageCount = await prisma.message.count()
    let contiguousOk = true
    if (messageCount > 0) {
      const sessions = await prisma.userSession.findMany({ include: { messages: { orderBy: { idx: 'asc' } } } })
      for (const s of sessions) {
        let expected = 1
        for (const m of s.messages) {
          if (m.idx !== expected) { contiguousOk = false; break }
          expected++
        }
        if (!contiguousOk) break
      }
    }
    return { sessionCount, messageCount, contiguousOk }
  } catch (e) {
    return { error: 'Failed DB completeness check: ' + (e.message || e) }
  }
}

async function start() {
  await ensureCoreDir()
  console.log('[core] Starting orchestration...')

  // Port pre-flight
  const apiBusy = await checkPort(API_PORT)
  const webBusy = await checkPort(WEB_PORT)
  const ollamaBusy = await checkPort(OLLAMA_PORT)

  if (apiBusy) {
    console.error(`[core] Port ${API_PORT} already in use. If an old API instance is running, run 'pnpm core:quit' or manually stop it.`)
  }
  if (webBusy) {
    console.error(`[core] Port ${WEB_PORT} already in use. If an old Web dev server is running, run 'pnpm core:quit' or stop it.`)
  }

  // Migrations (idempotent) + seed
  console.log('[core] Applying Prisma migrations (db:deploy)...')
  await runCmd('pnpm', ['-F', '@minimal-rpg/api', 'db:deploy'], { env: { DATABASE_URL: DEFAULT_DB_URL } }).catch(err => { throw new Error('Migration failed: ' + err.message) })
  console.log('[core] Seeding (db:seed)...')
  await runCmd('pnpm', ['-F', '@minimal-rpg/api', 'db:seed'], { env: { DATABASE_URL: DEFAULT_DB_URL } }).catch(err => { throw new Error('Seed failed: ' + err.message) })

  // Spawn API if free
  if (!apiBusy) {
    const apiPid = spawnDetached('api', 'pnpm', ['-F', '@minimal-rpg/api', 'dev'])
    await writePid('api', apiPid)
    console.log(`[core] API dev server spawned (pid ${apiPid}) on port ${API_PORT}`)
  } else {
    console.log('[core] Skipping API spawn (port busy)')
  }

  // Spawn Web if free
  if (!webBusy) {
    const webPid = spawnDetached('web', 'pnpm', ['-F', '@minimal-rpg/web', 'dev'])
    await writePid('web', webPid)
    console.log(`[core] Web dev server spawned (pid ${webPid}) on port ${WEB_PORT}`)
  } else {
    console.log('[core] Skipping Web spawn (port busy)')
  }

  // Health polling (only if API started or already running)
  let health
  try {
    health = await pollHealth()
  } catch (e) {
    console.error('[core] API health check timeout:', e.message)
  }

  if (health) {
    console.log(`[core] /health status: ${health.status}; db.ok=${health.db?.ok}; ollama.ok=${health.ollama?.ok}`)
    if (!health.ollama?.ok) {
      console.warn(`[core] Ollama not reachable on port ${OLLAMA_PORT}. Continuing without LLM; replies will fail. (Policy: warn only).`)
    }
  }

  // DB completeness
  const completeness = await dbCompleteness()
  if (completeness.error) {
    console.error('[core] DB completeness error:', completeness.error)
  } else {
    console.log(`[core] DB: sessions=${completeness.sessionCount}, messages=${completeness.messageCount}, contiguousIdx=${completeness.contiguousOk}`)
  }

  // Character / Setting counts (optional)
  try {
    const chars = await readJson(`http://localhost:${API_PORT}/characters`).catch(()=>[])
    const settings = await readJson(`http://localhost:${API_PORT}/settings`).catch(()=>[])
    if (Array.isArray(chars)) console.log(`[core] Characters loaded: ${chars.length}`)
    if (Array.isArray(settings)) console.log(`[core] Settings loaded: ${settings.length}`)
  } catch {}

  console.log('[core] Startup complete.')
  console.log('[core] Next: open http://localhost:5173 in your browser.')
  if (!ollamaBusy && health?.ollama?.ok === false) {
    console.log(`[core] Hint: Install & start Ollama, then set OLLAMA_MODEL env var and retry messages.`)
  }
}

start().catch(err => {
  console.error('[core] Fatal:', err.message)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect().catch(() => {})
})
