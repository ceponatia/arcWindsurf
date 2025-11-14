#!/usr/bin/env node
// Core teardown script: terminates API & Web processes tracked in .core/*.pid
// Sends SIGTERM, waits, then SIGKILL fallback. Verifies ports freed.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import net from 'node:net'

const ROOT = process.cwd()
const CORE_DIR = path.join(ROOT, '.core')
const API_PORT = Number(process.env.PORT || 3001)
const WEB_PORT = 5173

async function fileExists(p) { try { await fs.access(p); return true } catch { return false } }

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(1200)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => { socket.destroy(); resolve(false) })
    socket.connect(port, '127.0.0.1')
  })
}

async function killPid(name, signal='SIGTERM') {
  const file = path.join(CORE_DIR, `${name}.pid`)
  if (!(await fileExists(file))) return { skipped: true }
  const pidStr = await fs.readFile(file, 'utf8').catch(()=>null)
  if (!pidStr) return { error: 'missing pid content' }
  const pid = Number(pidStr.trim())
  if (!pid) return { error: 'invalid pid' }
  try {
    process.kill(pid, signal)
    return { pid }
  } catch (e) {
    return { error: e.message }
  }
}

async function waitForPortClosed(port, timeoutMs=8000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const busy = await checkPort(port)
    if (!busy) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

async function removePid(name) {
  const file = path.join(CORE_DIR, `${name}.pid`)
  if (await fileExists(file)) await fs.unlink(file).catch(()=>{})
}

async function teardown() {
  console.log('[core:quit] Stopping services...')

  const api1 = await killPid('api', 'SIGTERM')
  const web1 = await killPid('web', 'SIGTERM')

  // Wait for graceful shutdown
  const apiTerminated = await waitForPortClosed(API_PORT)
  const webTerminated = await waitForPortClosed(WEB_PORT)

  // Fallback SIGKILL
  if (!apiTerminated && !api1.skipped && !api1.error) {
    console.warn('[core:quit] API still alive, sending SIGKILL')
    await killPid('api', 'SIGKILL')
  }
  if (!webTerminated && !web1.skipped && !web1.error) {
    console.warn('[core:quit] Web still alive, sending SIGKILL')
    await killPid('web', 'SIGKILL')
  }

  // Final port check
  const apiBusy = await checkPort(API_PORT)
  const webBusy = await checkPort(WEB_PORT)

  // Cleanup pid files
  await removePid('api')
  await removePid('web')

  console.log('[core:quit] Summary:')
  console.log(`  API: ${apiBusy ? 'PORT STILL BUSY' : 'stopped'} (${api1.error ? 'error: '+api1.error : api1.skipped ? 'not started' : 'pid handled'})`)
  console.log(`  Web: ${webBusy ? 'PORT STILL BUSY' : 'stopped'} (${web1.error ? 'error: '+web1.error : web1.skipped ? 'not started' : 'pid handled'})`)

  if (apiBusy || webBusy) {
    console.log('[core:quit] If ports remain busy, identify processes manually (e.g., lsof -i :3001) and terminate them.')
  } else {
    console.log('[core:quit] All services stopped.')
  }
}

teardown().catch(e => {
  console.error('[core:quit] Fatal:', e.message)
  process.exit(1)
})
