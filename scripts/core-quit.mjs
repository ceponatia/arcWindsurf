#!/usr/bin/env node
// Core teardown script: terminates API & Web processes tracked in .core/*.pid
// Sends SIGTERM, waits, then SIGKILL fallback. Verifies ports freed.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'

const ROOT = process.cwd()
const CORE_DIR = path.join(ROOT, '.core')
const API_PORT = Number(process.env.PORT || 3001)
const WEB_PORT = 5173
const execFile = promisify(execFileCb)

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

async function findPidsOnPort(port) {
  const errors = []
  const found = new Set()

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFile('netstat', ['-ano'])
      const lines = stdout.split(/\r?\n/)
      for (const line of lines) {
        if (!line || !line.includes(`:${port}`)) continue
        const parts = line.trim().split(/\s+/)
        const pid = Number(parts[parts.length - 1])
        if (pid) found.add(pid)
      }
    } catch (err) {
      errors.push(err)
    }
    return { pids: Array.from(found), errors }
  }

  const commands = [
    { cmd: 'lsof', args: ['-t', '-i', `:${port}`] },
    { cmd: 'fuser', args: ['-n', 'tcp', `${port}`] },
  ]

  for (const { cmd, args } of commands) {
    try {
      const { stdout } = await execFile(cmd, args, { timeout: 2000 })
      const raw = stdout.trim()
      if (!raw) continue
      raw.split(/\s+/).forEach((token) => {
        if (!/^\d+$/.test(token)) return
        const pid = Number(token)
        if (pid) found.add(pid)
      })
      if (found.size) break
    } catch (err) {
      if (err?.code !== 1) errors.push(err)
    }
  }

  return { pids: Array.from(found), errors }
}

async function killPortProcesses(port, signal) {
  const { pids, errors: discoveryErrors } = await findPidsOnPort(port)
  const unique = Array.from(new Set(pids)).map(Number).filter(pid => pid && pid !== process.pid && pid !== process.ppid)
  const killed = []
  const killErrors = []

  for (const pid of unique) {
    try {
      process.kill(pid, signal)
      killed.push(pid)
    } catch (err) {
      if (err?.code === 'ESRCH') continue
      killErrors.push({ pid, message: err.message })
    }
  }

  return {
    signal,
    attempted: unique.length > 0,
    killed,
    killErrors,
    discoveryErrors,
  }
}

async function stopService(name, port) {
  console.log(`[core:quit] ${name.toUpperCase()} stopping...`)

  const summary = {
    name,
    port,
    pidTerm: await killPid(name, 'SIGTERM'),
    pidKill: null,
    portKills: [],
    busy: false,
  }

  let portClosed = await waitForPortClosed(port)

  if (!portClosed) {
    const portTerm = await killPortProcesses(port, 'SIGTERM')
    summary.portKills.push(portTerm)
    if (portTerm.attempted) {
      portClosed = await waitForPortClosed(port, 4000)
    }
  }

  if (!portClosed) {
    if (!summary.pidTerm?.skipped && !summary.pidTerm?.error) {
      summary.pidKill = await killPid(name, 'SIGKILL')
    }
    const portForce = await killPortProcesses(port, 'SIGKILL')
    summary.portKills.push(portForce)
    if (portForce.attempted) {
      portClosed = await waitForPortClosed(port, 4000)
    }
  }

  summary.busy = await checkPort(port)
  await removePid(name)

  return summary
}

async function removePid(name) {
  const file = path.join(CORE_DIR, `${name}.pid`)
  if (await fileExists(file)) await fs.unlink(file).catch(()=>{})
}

async function teardown() {
  console.log('[core:quit] Stopping services...')
  const api = await stopService('api', API_PORT)
  const web = await stopService('web', WEB_PORT)

  const reportLine = (service) => {
    const parts = []
    if (service.pidTerm?.error) parts.push(`pid error: ${service.pidTerm.error}`)
    else if (service.pidTerm?.skipped) parts.push('no pid file')
    else parts.push('pid handled')

    if (service.pidKill?.error) parts.push(`force pid error: ${service.pidKill.error}`)
    else if (service.pidKill && !service.pidKill.skipped && !service.pidKill.error) parts.push('force pid kill sent')

    service.portKills.forEach((attempt) => {
      const killed = attempt.killed.length ? `killed ${attempt.killed.join(',')}` : null
      const killErr = attempt.killErrors.length ? `errors ${attempt.killErrors.map(e => `${e.pid}:${e.message}`).join(',')}` : null
      const discoverErr = attempt.discoveryErrors.length ? 'port scan issues' : null
      const detail = [killed, killErr, discoverErr].filter(Boolean).join('; ')
      if (detail) parts.push(`${attempt.signal} ${detail}`)
    })

    return `${service.busy ? 'PORT STILL BUSY' : 'stopped'} (${parts.join('; ') || 'no actions'})`
  }

  console.log('[core:quit] Summary:')
  console.log(`  API: ${reportLine(api)}`)
  console.log(`  Web: ${reportLine(web)}`)

  if (api.busy || web.busy) {
    console.log('[core:quit] Remaining busy ports detected. Investigate manually (e.g., lsof -i :PORT).')
  } else {
    console.log('[core:quit] All monitored services stopped.')
  }
}

teardown().catch(e => {
  console.error('[core:quit] Fatal:', e.message)
  process.exit(1)
})
