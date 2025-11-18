#!/usr/bin/env node
// Stop core services by killing processes on their ports.

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const API_PORT = Number(process.env.PORT || 3001);
const WEB_PORT = 5173;

async function killPort(port, name) {
  try {
    const { stdout } = await execAsync(`lsof -t -i :${port}`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    if (pids.length > 0) {
      console.log(
        `[core:quit] Stopping ${name} (port ${port})... Killing PIDs: ${pids.join(', ')}`
      );
      await execAsync(`kill -9 ${pids.join(' ')}`);
    } else {
      console.log(`[core:quit] ${name} (port ${port}) is not running.`);
    }
  } catch (e) {
    if (e.code === 1) {
      console.log(`[core:quit] ${name} (port ${port}) is not running.`);
    } else {
      console.warn(`[core:quit] Warning: failed to check port ${port}: ${e.message}`);
    }
  }
}

async function main() {
  console.log('[core:quit] Stopping services...');
  await killPort(API_PORT, 'API');
  await killPort(WEB_PORT, 'Web');
  console.log('[core:quit] Done.');
}

main().catch(console.error);
