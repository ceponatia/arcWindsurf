/**
 * Session overrides (DEPRECATED)
 * PUT /sessions/:id/overrides/character - upsert character overrides
 * PUT /sessions/:id/overrides/setting - upsert setting overrides
 *
 * @deprecated Use POST /sessions/:id/turns with tool-based state patches instead.
 * These endpoints bypass the state manager turn lifecycle. Retained for debugging/admin use.
 */
import type { Context } from 'hono';
import { getSession } from '../../db/sessionsClient.js';
import type { LoadedDataGetter } from '../../data/types.js';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { OverridesAudit } from '../../sessions/types.js';
import {
  upsertCharacterOverrides,
  upsertSettingOverrides,
  getEffectiveCharacter,
  getEffectiveSetting,
} from '../../sessions/index.js';
import { notFound, badRequest, serverError } from '../../util/responses.js';
import { findCharacter, findSetting } from './shared.js';

export async function handlePutCharacterOverrides(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  console.warn('[DEPRECATED] PUT /sessions/:id/overrides/character bypasses state manager');
  const loaded = getLoaded();
  if (!loaded) return serverError(c, 'data not loaded');

  const id = c.req.param('id');
  const session = await getSession(id);
  if (!session) return notFound(c, 'session not found');

  const character = await findCharacter(loaded, session.characterTemplateId);
  if (!character) {
    return serverError(c, 'character not found for session');
  }

  const body: unknown = await c.req.json().catch(() => null);
  const overrides =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;

  if (!overrides || Array.isArray(overrides)) {
    return badRequest(c, 'overrides must be an object');
  }

  const audit = await upsertCharacterOverrides({
    sessionId: session.id,
    characterId: character.id,
    baseline: character,
    overrides,
  });

  const effective = await getEffectiveCharacter(session.id, character);
  return c.json(
    { effective, audit } satisfies {
      effective: CharacterProfile;
      audit: OverridesAudit;
    },
    200
  );
}

export async function handlePutSettingOverrides(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  console.warn('[DEPRECATED] PUT /sessions/:id/overrides/setting bypasses state manager');
  const loaded = getLoaded();
  if (!loaded) return serverError(c, 'data not loaded');

  const id = c.req.param('id');
  const session = await getSession(id);
  if (!session) return notFound(c, 'session not found');

  const setting = await findSetting(loaded, session.settingTemplateId);
  if (!setting) {
    return serverError(c, 'setting not found for session');
  }

  const body: unknown = await c.req.json().catch(() => null);
  const overrides =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;

  if (!overrides || Array.isArray(overrides)) {
    return badRequest(c, 'overrides must be an object');
  }

  const audit = await upsertSettingOverrides({
    sessionId: session.id,
    settingId: setting.id,
    baseline: setting,
    overrides,
  });

  const effective = await getEffectiveSetting(session.id, setting);
  return c.json(
    { effective, audit } satisfies {
      effective: SettingProfile;
      audit: OverridesAudit;
    },
    200
  );
}
