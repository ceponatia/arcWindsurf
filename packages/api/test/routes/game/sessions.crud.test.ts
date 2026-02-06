import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';

const crudMocks = vi.hoisted(() => ({
  createSessionMock: vi.fn(),
  deleteSessionMock: vi.fn(),
  getPromptTagMock: vi.fn(),
  createSessionTagBindingMock: vi.fn(),
  upsertActorStateMock: vi.fn(),
  ensureUserByEmailMock: vi.fn(),
  getSessionProjectionMock: vi.fn(),
  getEventsForSessionMock: vi.fn(),
  drizzleSelectMock: vi.fn(),
  drizzleTransactionMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
  getAuthUserMock: vi.fn(),
}));

const sessionsTable = { name: 'sessions' };
const sessionProjectionsTable = { name: 'sessionProjections' };
const actorStatesTable = { name: 'actorStates' };
const sessionTagsTable = { name: 'sessionTags' };
const promptTagsTable = { name: 'promptTags' };

vi.mock('@minimal-rpg/db/node', () => ({
  createSession: crudMocks.createSessionMock,
  deleteSession: crudMocks.deleteSessionMock,
  getPromptTag: crudMocks.getPromptTagMock,
  createSessionTagBinding: crudMocks.createSessionTagBindingMock,
  upsertActorState: crudMocks.upsertActorStateMock,
  getSessionProjection: crudMocks.getSessionProjectionMock,
  getEventsForSession: crudMocks.getEventsForSessionMock,
  ensureUserByEmail: crudMocks.ensureUserByEmailMock,
  drizzle: {
    select: crudMocks.drizzleSelectMock,
    transaction: crudMocks.drizzleTransactionMock,
  },
  sessions: sessionsTable,
  sessionProjections: sessionProjectionsTable,
  actorStates: actorStatesTable,
  sessionTags: sessionTagsTable,
  promptTags: promptTagsTable,
  inArray: vi.fn(),
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: crudMocks.getOwnerEmailMock,
}));

vi.mock('../../../src/auth/middleware.js', () => ({
  getAuthUser: crudMocks.getAuthUserMock,
}));

const sessionId = '11111111-1111-4111-8111-111111111111';

vi.mock('@minimal-rpg/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@minimal-rpg/utils')>();
  return {
    ...actual,
    generateId: () => sessionId,
    generateInstanceId: (id: string) => `${id}-instance`,
  };
});

interface SessionCrudModule {
  handleCreateSession: (c: Context, getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined) => Promise<Response>;
  handleDeleteSession: (c: Context) => Promise<Response>;
}

interface CreateFullModule {
  handleCreateFullSession: (c: Context, getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined) => Promise<Response>;
}

const { handleCreateSession, handleDeleteSession } = (await import(
  '../../../src/routes/game/sessions/session-crud.js'
)) as SessionCrudModule;

const { handleCreateFullSession } = (await import(
  '../../../src/routes/game/sessions/session-create-full.js'
)) as CreateFullModule;

const characterProfile: CharacterProfile = {
  id: 'char-1',
  name: 'Aria',
  summary: 'A determined adventurer.',
  backstory: 'Grew up in the capital.',
  race: 'Human',
  personality: 'curious',
  tags: ['draft'],
  tier: 'minor',
};

const settingProfile: SettingProfile = {
  id: 'setting-1',
  name: 'Stormreach',
  lore: 'A coastal city-state.',
};

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
      param: vi.fn((key: string) => (key === 'id' ? sessionId : '')),
      json: vi.fn(() => Promise.resolve(body)),
    },
    json: jsonResponse,
    body: bodyResponse,
  } as unknown as Context;
}

describe('routes/game/sessions create/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    crudMocks.getOwnerEmailMock.mockReturnValue('owner@example.com');
    crudMocks.getEventsForSessionMock.mockResolvedValue([]);
    crudMocks.getSessionProjectionMock.mockResolvedValue(null);
    crudMocks.deleteSessionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 500 when data is not loaded', async () => {
    const ctx = makeContext({ characterId: 'char-1', settingId: 'setting-1' });
    const res = await handleCreateSession(ctx, () => undefined);

    expect(res.status).toBe(500);
  });

  it('creates a session when inputs are valid', async () => {
    crudMocks.createSessionMock.mockResolvedValue({
      id: sessionId,
      playerCharacterId: null,
      settingId: null,
      createdAt: new Date('2026-02-06T12:00:00.000Z'),
    });
    crudMocks.getPromptTagMock.mockResolvedValue({ id: 'tag-1' });

    const ctx = makeContext({
      characterId: 'char-1',
      settingId: 'setting-1',
      tagIds: ['tag-1'],
    });

    const res = await handleCreateSession(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(sessionId);
    expect(crudMocks.createSessionTagBindingMock).toHaveBeenCalled();
  });

  it('rolls back when actor state creation fails', async () => {
    crudMocks.createSessionMock.mockResolvedValue({
      id: sessionId,
      playerCharacterId: null,
      settingId: null,
      createdAt: new Date('2026-02-06T12:00:00.000Z'),
    });
    crudMocks.upsertActorStateMock.mockRejectedValue(new Error('boom'));

    const ctx = makeContext({
      characterId: 'char-1',
      settingId: 'setting-1',
    });

    const res = await handleCreateSession(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(500);
    expect(crudMocks.deleteSessionMock).toHaveBeenCalledWith(sessionId, 'owner@example.com');
  });

  it('deletes a session', async () => {
    const ctx = makeContext();

    const res = await handleDeleteSession(ctx);

    expect(res.status).toBe(204);
    expect(crudMocks.deleteSessionMock).toHaveBeenCalled();
  });
});

describe('routes/game/sessions create-full', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    crudMocks.getAuthUserMock.mockReturnValue({ email: 'owner@example.com', identifier: 'owner', role: 'user' });
    crudMocks.drizzleSelectMock.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    const tx = {
      insert: () => ({
        values: () => Promise.resolve(undefined),
      }),
    };
    type Tx = typeof tx;
    crudMocks.drizzleTransactionMock.mockImplementation(
      async (callback: (transaction: Tx) => Promise<unknown>) => {
        return callback(tx);
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires an authenticated user', async () => {
    crudMocks.getAuthUserMock.mockReturnValue(null);

    const ctx = makeContext({
      settingId: 'setting-1',
      npcs: [{ characterId: 'char-1', role: 'primary', tier: 'minor' }],
    });

    const res = await handleCreateFullSession(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(400);
  });

  it('creates a full session', async () => {
    const ctx = makeContext({
      settingId: 'setting-1',
      npcs: [{ characterId: 'char-1', role: 'primary', tier: 'minor' }],
    });

    const res = await handleCreateFullSession(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; npcs: { templateId: string }[] };
    expect(body.id).toBe(sessionId);
    expect(body.npcs[0]?.templateId).toBe('char-1');
  });
});
