import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import { prisma } from '../db/prisma.js';
import { randomUUID } from 'node:crypto';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

export function deepMergeReplaceArrays<T>(base: T, override: unknown): T {
  if (!isPlainObject(override)) return base;
  const result = Array.isArray(base)
    ? [...(base as unknown[])]
    : { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override)) {
    const current = (result as Record<string, unknown>)[k];
    if (Array.isArray(v)) {
      (result as Record<string, unknown>)[k] = v;
    } else if (isPlainObject(v) && isPlainObject(current)) {
      (result as Record<string, unknown>)[k] = deepMergeReplaceArrays(current, v);
    } else {
      (result as Record<string, unknown>)[k] = v;
    }
  }
  return result as T;
}

function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function getCharacterOverrides(
  sessionId: string,
  characterId: string,
): Promise<Record<string, unknown> | undefined> {
  const row = await prisma.characterInstance.findUnique({
    where: { sessionId_templateCharacterId: { sessionId, templateCharacterId: characterId } },
  });
  if (!row) return undefined;
  return parseJson<Record<string, unknown>>(row.overrides, {});
}

export async function upsertCharacterOverrides(params: {
  sessionId: string;
  characterId: string;
  baseline: CharacterProfile;
  overrides: Record<string, unknown>;
}): Promise<{ baseline: Record<string, unknown>; overrides: Record<string, unknown> }> {
  const { sessionId, characterId, baseline, overrides } = params;
  const existing = await prisma.characterInstance.findUnique({
    where: { sessionId_templateCharacterId: { sessionId, templateCharacterId: characterId } },
  });
  if (!existing) {
    await prisma.characterInstance.create({
      data: {
        id: randomUUID(),
        sessionId,
        templateCharacterId: characterId,
        baseline: JSON.stringify(baseline),
        overrides: JSON.stringify(overrides),
      },
    });
    return { baseline: baseline as unknown as Record<string, unknown>, overrides };
  }
  await prisma.characterInstance.update({
    where: { id: existing.id },
    data: { overrides: JSON.stringify(overrides) },
  });
  const baseObj = parseJson<Record<string, unknown>>(existing.baseline, {});
  return { baseline: baseObj, overrides };
}

export async function getSettingOverrides(
  sessionId: string,
  settingId: string,
): Promise<Record<string, unknown> | undefined> {
  const row = await prisma.settingInstance.findUnique({
    where: { sessionId_templateSettingId: { sessionId, templateSettingId: settingId } },
  });
  if (!row) return undefined;
  return parseJson<Record<string, unknown>>(row.overrides, {});
}

export async function upsertSettingOverrides(params: {
  sessionId: string;
  settingId: string;
  baseline: SettingProfile;
  overrides: Record<string, unknown>;
}): Promise<{ baseline: Record<string, unknown>; overrides: Record<string, unknown> }> {
  const { sessionId, settingId, baseline, overrides } = params;
  const existing = await prisma.settingInstance.findUnique({
    where: { sessionId_templateSettingId: { sessionId, templateSettingId: settingId } },
  });
  if (!existing) {
    await prisma.settingInstance.create({
      data: {
        id: randomUUID(),
        sessionId,
        templateSettingId: settingId,
        baseline: JSON.stringify(baseline),
        overrides: JSON.stringify(overrides),
      },
    });
    return { baseline: baseline as unknown as Record<string, unknown>, overrides };
  }
  await prisma.settingInstance.update({
    where: { id: existing.id },
    data: { overrides: JSON.stringify(overrides) },
  });
  const baseObj = parseJson<Record<string, unknown>>(existing.baseline, {});
  return { baseline: baseObj, overrides };
}

export async function getEffectiveCharacter(
  sessionId: string,
  character: CharacterProfile,
): Promise<CharacterProfile> {
  const overrides = await getCharacterOverrides(sessionId, character.id);
  if (!overrides) return character;
  return deepMergeReplaceArrays<CharacterProfile>(character, overrides);
}

export async function getEffectiveSetting(
  sessionId: string,
  setting: SettingProfile,
): Promise<SettingProfile> {
  const overrides = await getSettingOverrides(sessionId, setting.id);
  if (!overrides) return setting;
  return deepMergeReplaceArrays<SettingProfile>(setting, overrides);
}

export async function getEffectiveProfiles(
  sessionId: string,
  character: CharacterProfile,
  setting: SettingProfile,
): Promise<{ character: CharacterProfile; setting: SettingProfile }> {
  const [c, s] = await Promise.all([
    getEffectiveCharacter(sessionId, character),
    getEffectiveSetting(sessionId, setting),
  ]);
  return { character: c, setting: s };
}
