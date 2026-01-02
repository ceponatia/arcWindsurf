import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import type { OverridesObject, OverridesAudit } from './types.js';
import { db } from '../db/prismaClient.js';
import { deepMergeReplaceArrays } from '@minimal-rpg/utils';

function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function upsertCharacterOverrides(params: {
  sessionId: string;
  characterId: string;
  baseline: CharacterProfile;
  overrides: OverridesObject;
}): Promise<OverridesAudit> {
  const { sessionId, baseline, overrides } = params;
  const instance = await db.characterInstance.findUnique({ where: { sessionId } });
  if (!instance) {
    throw new Error(`character instance not found for session ${sessionId}`);
  }

  const baselineObj = parseJson<Record<string, unknown>>(instance.templateSnapshot, {});
  const currentProfile = parseJson<CharacterProfile>(instance.profileJson, baseline);
  const previous = { ...(currentProfile as unknown as Record<string, unknown>) };
  const nextProfile = deepMergeReplaceArrays<CharacterProfile>(currentProfile, overrides);
  const parsedNext = CharacterProfileSchema.safeParse(nextProfile);

  await db.characterInstance.update({
    where: { id: instance.id },
    data: { profileJson: JSON.stringify(parsedNext.success ? parsedNext.data : nextProfile) },
  });

  return {
    baseline: baselineObj,
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
  const instance = await db.settingInstance.findUnique({ where: { sessionId } });
  if (!instance) {
    throw new Error(`setting instance not found for session ${sessionId}`);
  }

  const baselineObj = parseJson<Record<string, unknown>>(instance.templateSnapshot, {});
  const currentProfile = parseJson<SettingProfile>(instance.profileJson, baseline);
  const previous = { ...(currentProfile as unknown as Record<string, unknown>) };
  const nextProfile = deepMergeReplaceArrays<SettingProfile>(currentProfile, overrides);
  const parsedNext = SettingProfileSchema.safeParse(nextProfile);

  await db.settingInstance.update({
    where: { id: instance.id },
    data: { profileJson: JSON.stringify(parsedNext.success ? parsedNext.data : nextProfile) },
  });

  return {
    baseline: baselineObj,
    overrides,
    previous,
  };
}

export async function getEffectiveCharacter(
  sessionId: string,
  character: CharacterProfile
): Promise<CharacterProfile> {
  const instance = await db.characterInstance.findUnique({ where: { sessionId } });
  if (!instance) return character;
  const parsed = parseJson<CharacterProfile>(instance.profileJson, character);
  const refined = CharacterProfileSchema.safeParse(parsed);
  return refined.success ? refined.data : character;
}

export async function getEffectiveSetting(
  sessionId: string,
  setting: SettingProfile
): Promise<SettingProfile> {
  const instance = await db.settingInstance.findUnique({ where: { sessionId } });
  if (!instance) return setting;
  const parsed = parseJson<SettingProfile>(instance.profileJson, setting);
  const refined = SettingProfileSchema.safeParse(parsed);
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
