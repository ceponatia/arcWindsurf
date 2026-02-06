import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';

const messageMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  eqMock: vi.fn(),
  andMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

const eventsTable = { sessionId: 'sessionId', sequence: 'sequence', type: 'type' };

vi.mock('@minimal-rpg/db/node', () => ({
  getSession: messageMocks.getSessionMock,
  drizzle: {
    select: messageMocks.selectMock,
    update: messageMocks.updateMock,
    delete: messageMocks.deleteMock,
  },
  events: eventsTable,
  eq: messageMocks.eqMock,
  and: messageMocks.andMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: messageMocks.getOwnerEmailMock,
}));

interface MessageModule {
  handlePatchMessage: (c: Context) => Promise<Response>;
  handleDeleteMessage: (c: Context) => Promise<Response>;
}

const { handlePatchMessage, handleDeleteMessage } = (await import(
  '../../../src/routes/game/sessions/session-messages.js'
)) as MessageModule;

const sessionId = '11111111-1111-4111-8111-111111111111';

function makeContext(body?: unknown): Context {
  const jsonResponse = (value: unknown, status?: number) => {
    const init = status ? { status } : undefined;
    return new Response(JSON.stringify(value), init);
  };

  const bodyResponse = (value: string | null, status?: number) => {
    const init = status ? { status } : undefined;
    return new Response(value, init);
  };

  return {
    req: {
      param: vi.fn((key: string) => (key === 'id' ? sessionId : '1')),
      json: vi.fn(() => Promise.resolve(body)),
    },
    json: jsonResponse,
    body: bodyResponse,
  } as unknown as Context;
}

describe('routes/game/sessions messages maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageMocks.getOwnerEmailMock.mockReturnValue('owner@example.com');
    messageMocks.getSessionMock.mockResolvedValue({ id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates a message by index', async () => {
    messageMocks.selectMock.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [{ payload: { content: 'old' } }],
        }),
      }),
    });
    messageMocks.updateMock.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => [{ id: 'event-1' }],
        }),
      }),
    });

    const ctx = makeContext({ content: 'new' });
    const res = await handlePatchMessage(ctx);

    expect(res.status).toBe(204);
  });

  it('returns not found when message is missing', async () => {
    messageMocks.selectMock.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    const ctx = makeContext({ content: 'new' });
    const res = await handlePatchMessage(ctx);

    expect(res.status).toBe(404);
  });

  it('deletes a message by index', async () => {
    messageMocks.selectMock.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [{ id: 'event-1' }],
        }),
      }),
    });
    messageMocks.deleteMock.mockReturnValue({
      where: () => undefined,
    });

    const ctx = makeContext();
    const res = await handleDeleteMessage(ctx);

    expect(res.status).toBe(204);
  });
});
