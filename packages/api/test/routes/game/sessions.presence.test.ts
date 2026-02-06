import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';

const presenceMocks = vi.hoisted(() => ({
  recordHeartbeatMock: vi.fn(),
  removeSessionMock: vi.fn(),
}));

vi.mock('@minimal-rpg/services', () => ({
  presenceService: {
    recordHeartbeat: presenceMocks.recordHeartbeatMock,
    removeSession: presenceMocks.removeSessionMock,
  },
}));

interface PresenceModule {
  handleSessionHeartbeat: (c: Context) => Promise<Response>;
  handleSessionDisconnect: (c: Context) => Response;
}

const { handleSessionHeartbeat } = (await import(
  '../../../src/routes/game/sessions/session-heartbeat.js'
)) as PresenceModule;

const { handleSessionDisconnect } = (await import(
  '../../../src/routes/game/sessions/session-disconnect.js'
)) as PresenceModule;

function makeContext(sessionId: string): Context {
  const jsonResponse = (value: unknown, status?: number) => {
    const init = status ? { status } : undefined;
    return new Response(JSON.stringify(value), init);
  };

  return {
    req: {
      param: vi.fn(() => sessionId),
    },
    json: jsonResponse,
  } as unknown as Context;
}

describe('routes/game/sessions presence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records session heartbeat', async () => {
    presenceMocks.recordHeartbeatMock.mockResolvedValue({
      status: 'running',
      lastHeartbeatAt: new Date('2026-02-06T12:00:00.000Z'),
    });

    const ctx = makeContext('session-1');
    const res = await handleSessionHeartbeat(ctx);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; status: string };
    expect(body.ok).toBe(true);
    expect(body.status).toBe('running');
  });

  it('removes session on disconnect', async () => {
    const ctx = makeContext('session-1');
    const res = handleSessionDisconnect(ctx);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; sessionId: string };
    expect(body.ok).toBe(true);
    expect(body.sessionId).toBe('session-1');
    expect(presenceMocks.removeSessionMock).toHaveBeenCalledWith('session-1');
  });
});
