import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import {
  upsertCharacterOverrides,
  upsertSettingOverrides,
  getEffectiveCharacter,
  getEffectiveSetting,
  getEffectiveProfiles,
} from '../../src/services/instances.js';

const instanceMocks = vi.hoisted(() => ({
  getActorStateMock: vi.fn(),
  upsertActorStateMock: vi.fn(),
  getProjectionMock: vi.fn(),
  upsertProjectionMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  getActorState: instanceMocks.getActorStateMock,
  upsertActorState: instanceMocks.upsertActorStateMock,
  getProjection: instanceMocks.getProjectionMock,
  upsertProjection: instanceMocks.upsertProjectionMock,
}));

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

describe('services/instances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates character overrides and returns audit info', async () => {
    instanceMocks.getActorStateMock.mockResolvedValue({
      sessionId: 'session-1',
      actorId: 'char-1',
      actorType: 'player',
      entityProfileId: 'char-1',
      state: characterProfile,
      lastEventSeq: 2,
    });

    const audit = await upsertCharacterOverrides({
      sessionId: 'session-1',
      characterId: 'char-1',
      baseline: characterProfile,
      overrides: { summary: 'Updated summary' },
    });

    expect(instanceMocks.upsertActorStateMock).toHaveBeenCalledTimes(1);
    const updateArgs = instanceMocks.upsertActorStateMock.mock.calls[0]?.[0] as {
      state: CharacterProfile;
    };
    expect(updateArgs.state.summary).toBe('Updated summary');
    expect(audit.previous).toBeDefined();
    expect(audit.previous?.['summary']).toBe(characterProfile.summary);
  });

  it('throws when character actor state is missing', async () => {
    instanceMocks.getActorStateMock.mockResolvedValue(null);

    await expect(
      upsertCharacterOverrides({
        sessionId: 'session-1',
        characterId: 'char-1',
        baseline: characterProfile,
        overrides: { summary: 'Updated summary' },
      })
    ).rejects.toThrow('actor state not found');
  });

  it('updates setting overrides', async () => {
    instanceMocks.getProjectionMock.mockResolvedValue({
      sessionId: 'session-1',
      worldState: settingProfile,
    });

    await upsertSettingOverrides({
      sessionId: 'session-1',
      settingId: 'setting-1',
      baseline: settingProfile,
      overrides: { lore: 'New lore' },
    });

    expect(instanceMocks.upsertProjectionMock).toHaveBeenCalledTimes(1);
    const updateArgs = instanceMocks.upsertProjectionMock.mock.calls[0]?.[1] as {
      worldState: SettingProfile;
    };
    expect(updateArgs.worldState.lore).toBe('New lore');
  });

  it('returns baseline profiles when overrides are invalid', async () => {
    instanceMocks.getActorStateMock.mockResolvedValue({
      sessionId: 'session-1',
      actorId: 'char-1',
      actorType: 'player',
      entityProfileId: 'char-1',
      state: { id: 'char-1' },
      lastEventSeq: 2,
    });

    instanceMocks.getProjectionMock.mockResolvedValue({
      sessionId: 'session-1',
      worldState: { id: 'setting-1' },
    });

    await expect(getEffectiveCharacter('session-1', characterProfile)).resolves.toEqual(
      characterProfile
    );

    await expect(getEffectiveSetting('session-1', settingProfile)).resolves.toEqual(
      settingProfile
    );
  });

  it('returns effective profiles', async () => {
    instanceMocks.getActorStateMock.mockResolvedValue({
      sessionId: 'session-1',
      actorId: 'char-1',
      actorType: 'player',
      entityProfileId: 'char-1',
      state: characterProfile,
      lastEventSeq: 2,
    });

    instanceMocks.getProjectionMock.mockResolvedValue({
      sessionId: 'session-1',
      worldState: settingProfile,
    });

    const result = await getEffectiveProfiles('session-1', characterProfile, settingProfile);

    expect(result.character).toEqual(characterProfile);
    expect(result.setting).toEqual(settingProfile);
  });
});
