import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'hono';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';

const effectiveMocks = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getOwnerEmailMock: vi.fn(),
  getEffectiveProfilesMock: vi.fn(),
  upsertCharacterOverridesMock: vi.fn(),
  upsertSettingOverridesMock: vi.fn(),
  getEffectiveCharacterMock: vi.fn(),
  getEffectiveSettingMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getSession: effectiveMocks.getSessionMock,
}));

vi.mock('../../../src/auth/ownerEmail.js', () => ({
  getOwnerEmail: effectiveMocks.getOwnerEmailMock,
}));

vi.mock('../../../src/services/index.js', () => ({
  getEffectiveProfiles: effectiveMocks.getEffectiveProfilesMock,
  upsertCharacterOverrides: effectiveMocks.upsertCharacterOverridesMock,
  upsertSettingOverrides: effectiveMocks.upsertSettingOverridesMock,
  getEffectiveCharacter: effectiveMocks.getEffectiveCharacterMock,
  getEffectiveSetting: effectiveMocks.getEffectiveSettingMock,
}));

interface EffectiveModule {
  handleGetEffective: (c: Context, getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined) => Promise<Response>;
}

interface OverridesModule {
  handlePutCharacterOverrides: (c: Context, getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined) => Promise<Response>;
  handlePutSettingOverrides: (c: Context, getLoaded: () => { characters: CharacterProfile[]; settings: SettingProfile[] } | undefined) => Promise<Response>;
}

const { handleGetEffective } = (await import(
  '../../../src/routes/game/sessions/session-effective.js'
)) as EffectiveModule;

const { handlePutCharacterOverrides, handlePutSettingOverrides } = (await import(
  '../../../src/routes/game/sessions/session-overrides.js'
)) as OverridesModule;

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

const sessionId = '11111111-1111-4111-8111-111111111111';

function makeContext(body?: unknown): Context {
  const jsonResponse = (value: unknown, status?: number) => {
    const init = status ? { status } : undefined;
    return new Response(JSON.stringify(value), init);
  };

  return {
    req: {
      param: vi.fn((key: string) => (key === 'id' ? sessionId : '')),
      json: vi.fn(() => Promise.resolve(body)),
    },
    json: jsonResponse,
  } as unknown as Context;
}

describe('routes/game/sessions effective and overrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    effectiveMocks.getOwnerEmailMock.mockReturnValue('owner@example.com');
    effectiveMocks.getSessionMock.mockResolvedValue({
      id: sessionId,
      playerCharacterId: 'char-1',
      settingId: 'setting-1',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns effective profiles', async () => {
    effectiveMocks.getEffectiveProfilesMock.mockResolvedValue({ ok: true });

    const ctx = makeContext();
    const res = await handleGetEffective(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(200);
  });

  it('rejects override updates when data is missing', async () => {
    const ctx = makeContext({ field: 'value' });
    const res = await handlePutCharacterOverrides(ctx, () => undefined);

    expect(res.status).toBe(500);
  });

  it('updates character overrides', async () => {
    effectiveMocks.upsertCharacterOverridesMock.mockResolvedValue({ id: 'audit' });
    effectiveMocks.getEffectiveCharacterMock.mockResolvedValue(characterProfile);

    const ctx = makeContext({ field: 'value' });
    const res = await handlePutCharacterOverrides(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { effective: { id: string } };
    expect(body.effective.id).toBe('char-1');
  });

  it('updates setting overrides', async () => {
    effectiveMocks.upsertSettingOverridesMock.mockResolvedValue({ id: 'audit' });
    effectiveMocks.getEffectiveSettingMock.mockResolvedValue(settingProfile);

    const ctx = makeContext({ field: 'value' });
    const res = await handlePutSettingOverrides(ctx, () => ({
      characters: [characterProfile],
      settings: [settingProfile],
    }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { effective: { id: string } };
    expect(body.effective.id).toBe('setting-1');
  });
});
