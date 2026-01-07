import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import type { OverridesObject, OverridesAudit } from './types.js';
import {
  getActorState,
  upsertActorState,
  getProjection,
  upsertProjection,
} from '@minimal-rpg/db/node';
import { deepMergeReplaceArrays } from '@minimal-rpg/utils';

export async function upsertCharacterOverrides(params: {
  sessionId: string;
  characterId: string;
  baseline: CharacterProfile;
  overrides: OverridesObject;
}): Promise<OverridesAudit> {
  const { sessionId, characterId, baseline, overrides } = params;

  // Use characterId as the actorId for the player
  const actorState = await getActorState(sessionId as any, characterId);
  if (!actorState) {
    throw new Error(`actor state not found for session ${sessionId} character ${characterId}`);
  }

  const currentProfile = (actorState.state as CharacterProfile) || baseline;
  const previous = { ...(currentProfile as unknown as Record<string, unknown>) };
  const nextProfile = deepMergeReplaceArrays<CharacterProfile>(currentProfile, overrides);
  const parsedNext = CharacterProfileSchema.safeParse(nextProfile);

  const finalProfile = parsedNext.success ? parsedNext.data : nextProfile;

  await upsertActorState({
    sessionId: sessionId as any,
    actorId: characterId,
    actorType: 'player',
    entityProfileId: actorState.entityProfileId as any,
    state: finalProfile as any,
    lastEventSeq: actorState.lastEventSeq,
  });

  return {
    baseline: baseline as any,
    overrides,
    previous,
  };
}

export async function upsertSettingOverrides(params: {
  sessionId: string;
  settingId: string;
  baseline: SettingProfile;
  overrides: OverridesObject;
}): Promise<OverridesAudit> {
  const { sessionId, baseline, overrides } = params;

  const projection = await getProjection(sessionId as any);
  if (!projection) {
    throw new Error(`projection not found for session ${sessionId}`);
  }

  const currentProfile = (projection.worldState as SettingProfile) || baseline;
  const previous = { ...(currentProfile as unknown as Record<string, unknown>) };
  const nextProfile = deepMergeReplaceArrays<SettingProfile>(currentProfile, overrides);
  const parsedNext = SettingProfileSchema.safeParse(nextProfile);

  const finalProfile = parsedNext.success ? parsedNext.data : nextProfile;

  await upsertProjection(sessionId as any, {
    worldState: finalProfile as any,
  });

  return {
    baseline: baseline as any,
    overrides,
    previous,
  };
}

export async function getEffectiveCharacter(
  sessionId: string,
  character: CharacterProfile
): Promise<CharacterProfile> {
  const actorState = await getActorState(sessionId as any, character.id);
  if (!actorState) return character;

  const refined = CharacterProfileSchema.safeParse(actorState.state);
  return refined.success ? refined.data : character;
}

export async function getEffectiveSetting(
  sessionId: string,
  setting: SettingProfile
): Promise<SettingProfile> {
  const projection = await getProjection(sessionId as any);
  if (!projection) return setting;

  const refined = SettingProfileSchema.safeParse(projection.worldState);
  return refined.success ? refined.data : setting;
}

export async function getEffectiveProfiles(
  sessionId: string,
  character: CharacterProfile,
  setting: SettingProfile
): Promise<{ character: CharacterProfile; setting: SettingProfile }> {
  const [c, s] = await Promise.all([
    getEffectiveCharacter(sessionId, character),
    getEffectiveSetting(sessionId, setting),
  ]);
  return { character: c, setting: s };
}
