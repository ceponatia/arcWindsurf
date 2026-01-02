#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${String(value)}`);
  }
  return port;
}

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {{ ok: boolean; stdout: string; stderr: string; status: number | null; error?: unknown }}
 */
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
    error: result.error,
  };
}

/**
 * @param {number} port
 * @returns {{ pids: number[]; usedTool: string | null }}
 */
function getPidsForPort(port) {
  const lsof = run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);

  if (lsof.error && /** @type {{ code?: string }} */ (lsof.error).code === 'ENOENT') {
    // fall through
  } else if (lsof.ok) {
    const pids = lsof.stdout
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => Number(line))
      .filter((pid) => Number.isInteger(pid) && pid > 0);

    return { pids: Array.from(new Set(pids)), usedTool: 'lsof' };
  } else {
    // lsof returns exit code 1 when nothing matches.
    const maybeNoMatches = lsof.status === 1 && lsof.stdout.trim() === '';
    if (maybeNoMatches) {
      return { pids: [], usedTool: 'lsof' };
    }
  }

  if (process.platform === 'linux') {
    const fuser = run('fuser', ['-n', 'tcp', String(port)]);

    if (fuser.error && /** @type {{ code?: string }} */ (fuser.error).code === 'ENOENT') {
      return { pids: [], usedTool: null };
    }

    // fuser prints pids separated by spaces; exit code 1 means no processes.
    if (fuser.status === 1) {
      return { pids: [], usedTool: 'fuser' };
    }

    if (fuser.ok) {
      const pids = fuser.stdout
        .split(/\s+/g)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => Number(token))
        .filter((pid) => Number.isInteger(pid) && pid > 0);

      return { pids: Array.from(new Set(pids)), usedTool: 'fuser' };
    }
  }

  return { pids: [], usedTool: null };
}

/**
 * @param {number} pid
 * @returns {boolean}
 */
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = /** @type {{ code?: string }} */ (error).code;
      if (code === 'ESRCH') return false;
    }
    // If we don't have permission to signal, it's still alive.
    return true;
  }
}

/**
 * @param {number} pid
 * @returns {Promise<"killed" | "already-dead" | "failed">}
 */
async function terminatePid(pid) {
  if (!isPidAlive(pid)) return 'already-dead';

  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = /** @type {{ code?: string }} */ (error).code;
      if (code === 'ESRCH') return 'already-dead';
    }
    return 'failed';
  }

  await sleep(350);

  if (!isPidAlive(pid)) return 'killed';

  try {
    process.kill(pid, 'SIGKILL');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = /** @type {{ code?: string }} */ (error).code;
      if (code === 'ESRCH') return 'killed';
    }
    return 'failed';
  }

  await sleep(150);

  return isPidAlive(pid) ? 'failed' : 'killed';
}

const ports = (() => {
  const args = process.argv.slice(2);
  if (args.length === 0) return [3001, 5173];
  return args.map(parsePort);
})();

const currentPid = process.pid;

let foundAny = false;
let usedTool = /** @type {string | null} */ (null);

for (const port of ports) {
  const { pids, usedTool: tool } = getPidsForPort(port);
  if (!usedTool && tool) usedTool = tool;

  const filtered = pids.filter((pid) => pid !== currentPid);

  if (filtered.length === 0) {
    console.log(`No listeners found on :${port}`);
    continue;
  }

  foundAny = true;
  console.log(`Killing ${filtered.length} process(es) on :${port} (pids: ${filtered.join(', ')})`);

  for (const pid of filtered) {
    const result = await terminatePid(pid);
    if (result === 'failed') {
      console.warn(`Failed to terminate pid ${pid} (port ${port})`);
    }
  }
}

if (!foundAny && !usedTool) {
  console.error(
    "Could not find a port-inspection tool. Install 'lsof' (recommended) or (Linux) 'fuser'."
  );
  process.exitCode = 1;
}
