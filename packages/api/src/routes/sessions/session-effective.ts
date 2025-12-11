/**
 * Session effective profiles
 * GET /sessions/:id/effective - merged character + setting profiles
 */
import type { Context } from 'hono';
import { getSession } from '../../db/sessionsClient.js';
import type { LoadedDataGetter } from '../../data/types.js';
import type { EffectiveProfilesResponse } from '../../sessions/types.js';
import { getEffectiveProfiles } from '../../sessions/index.js';
import { notFound, serverError } from '../../util/responses.js';
import { findCharacter, findSetting } from './shared.js';

export async function handleGetEffective(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  const loaded = getLoaded();
  if (!loaded) return serverError(c, 'data not loaded');

  const id = c.req.param('id');
  const session = await getSession(id);
  if (!session) return notFound(c, 'session not found');

  const character = await findCharacter(loaded, session.characterTemplateId);
  const setting = await findSetting(loaded, session.settingTemplateId);
  if (!character || !setting) {
    return serverError(c, 'character or setting not found for session');
  }

  const effective = await getEffectiveProfiles(session.id, character, setting);
  return c.json(effective satisfies EffectiveProfilesResponse, 200);
}
