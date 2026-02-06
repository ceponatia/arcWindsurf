import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const entrypointMocks = vi.hoisted(() => ({
  dotenvConfigMock: vi.fn(),
  startServerMock: vi.fn(),
}));

vi.mock('dotenv', () => ({
  default: {
    config: entrypointMocks.dotenvConfigMock,
  },
}));

vi.mock('../src/server-impl.js', () => ({
  startServer: entrypointMocks.startServerMock,
}));

/**
 * Resolve the .env path expected by the server entrypoint.
 */
function getExpectedEnvPath(): string {
  const serverPath = fileURLToPath(new URL('../src/server.ts', import.meta.url));
  const serverDir = path.dirname(serverPath);
  return path.resolve(serverDir, '../../../.env');
}

/**
 * Import the server entrypoint after mocks are applied.
 */
async function importServerEntrypoint(): Promise<void> {
  await import('../src/server.js');
}

describe('server entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('loads .env before starting the server', async () => {
    const events: string[] = [];
    entrypointMocks.dotenvConfigMock.mockImplementation(() => {
      events.push('dotenv');
      return { parsed: {} };
    });
    entrypointMocks.startServerMock.mockImplementation(() => {
      events.push('start');
    });

    await importServerEntrypoint();

    expect(entrypointMocks.dotenvConfigMock).toHaveBeenCalledWith({
      path: getExpectedEnvPath(),
    });
    expect(entrypointMocks.startServerMock).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['dotenv', 'start']);
  });
});
