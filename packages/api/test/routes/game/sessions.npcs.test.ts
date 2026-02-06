import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';

const npcMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  listActorStatesForSessionMock: vi.fn(),
  upsertActorStateMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getSession: npcMocks.getSessionMock,
  listActorStatesForSession: npcMocks.listActorStatesForSessionMock,
  upsertActorState: npcMocks.upsertActorStateMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: npcMocks.getOwnerEmailMock,
}));

vi.mock('@minimal-rpg/utils', () => ({
  generateInstanceId: (id: string) => `${id}-instance`,
}));

interface NpcRoutesModule {
  handleListNpcs: (c: Context) => Promise<Response>;
  handleCreateNpc: (c: Context, getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined) => Promise<Response>;
}

const { handleListNpcs, handleCreateNpc } = (await import(
  '../../../src/routes/game/sessions/session-npcs.js'
)) as NpcRoutesModule;

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

  return {
    req: {
      param: vi.fn((key: string) => (key === 'id' ? 'session-1' : '')),
      json: vi.fn(() => Promise.resolve(body)),
    },
    json: jsonResponse,
  } as unknown as Context;
}

describe('routes/game/sessions npcs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    npcMocks.getOwnerEmailMock.mockReturnValue('owner@example.com');
    npcMocks.getSessionMock.mockResolvedValue({ id: 'session-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists npc instances', async () => {
    npcMocks.listActorStatesForSessionMock.mockResolvedValue([
      {
        actorType: 'npc',
        actorId: 'npc-1',
        entityProfileId: 'char-1',
        state: { role: 'npc', label: null, name: 'Aria' },
        createdAt: new Date('2026-02-06T12:00:00.000Z'),
      },
    ]);

    const ctx = makeContext();
    const res = await handleListNpcs(ctx);
    const body = (await res.json()) as { ok: boolean; npcs: { id: string }[] };

    expect(body.ok).toBe(true);
    expect(body.npcs[0]?.id).toBe('npc-1');
  });

  it('creates an npc instance', async () => {
    npcMocks.listActorStatesForSessionMock.mockResolvedValue([]);

    const ctx = makeContext({ templateId: 'char-1', role: 'npc' });
    const res = await handleCreateNpc(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; id: string };
    expect(body.ok).toBe(true);
    expect(body.id).toBe('char-1-instance');
    expect(npcMocks.upsertActorStateMock).toHaveBeenCalled();
  });

  it('rejects creating a duplicate primary npc', async () => {
    npcMocks.listActorStatesForSessionMock.mockResolvedValue([
      { actorType: 'npc', actorId: 'npc-1', state: { role: 'primary' } },
    ]);

    const ctx = makeContext({ templateId: 'char-1', role: 'primary' });
    const res = await handleCreateNpc(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(409);
  });
});
