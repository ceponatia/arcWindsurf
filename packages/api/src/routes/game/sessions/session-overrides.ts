/**
 * Session overrides (DEPRECATED)
 * PUT /sessions/:id/overrides/character - upsert character overrides
 * PUT /sessions/:id/overrides/setting - upsert setting overrides
 *
 * @deprecated Use POST /sessions/:id/turns with tool-based state patches instead.
 * These endpoints bypass the state manager turn lifecycle. Retained for debugging/admin use.
 */
import type { Context } from 'hono';
import { getSession } from '@minimal-rpg/db/node';
import type { LoadedDataGetter } from '../../../loaders/types.js';
import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { OverridesAudit } from '../../../services/types.js';
import { validateBody, validateParamId } from '../../../utils/request-validation.js';
import { z } from 'zod';
import {
  upsertCharacterOverrides,
  upsertSettingOverrides,
  getEffectiveCharacter,
  getEffectiveSetting,
} from '../../../services/index.js';
import { notFound, serverError } from '../../../utils/responses.js';
import { findCharacter, findSetting } from './shared.js';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toSessionId } from '../../../utils/uuid.js';

interface SessionRecord {
  id: string;
  playerCharacterId?: string | null;
  settingId?: string | null;
}

const OverridesSchema = z.record(z.string(), z.unknown());

export async function handlePutCharacterOverrides(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  console.warn('[DEPRECATED] PUT /sessions/:id/overrides/character bypasses state manager');
  const loaded = getLoaded();
  if (!loaded) return serverError(c, 'data not loaded');

  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;
  const ownerEmail = getOwnerEmail(c);
  const session = (await getSession(toSessionId(id), ownerEmail)) as SessionRecord | null;
  if (!session) return notFound(c, 'session not found');

  const character = await findCharacter(loaded, session.playerCharacterId ?? '');
  if (!character) {
    return serverError(c, 'character not found for session');
  }

  const bodyResult = await validateBody(c, OverridesSchema);
  if (!bodyResult.success) return bodyResult.errorResponse;
  const overrides = bodyResult.data;

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

  const idResult = validateParamId(c, 'id');
  if (!idResult.success) return idResult.errorResponse;
  const id = idResult.data;
  const ownerEmail = getOwnerEmail(c);
  const session = (await getSession(toSessionId(id), ownerEmail)) as SessionRecord | null;
  if (!session) return notFound(c, 'session not found');

  const setting = await findSetting(loaded, session.settingId ?? '');
  if (!setting) {
    return serverError(c, 'setting not found for session');
  }

  const bodyResult = await validateBody(c, OverridesSchema);
  if (!bodyResult.success) return bodyResult.errorResponse;
  const overrides = bodyResult.data;

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
