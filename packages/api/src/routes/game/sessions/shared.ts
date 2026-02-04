/**
 * Shared utilities for session routes.
 */
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
  CreateNpcInstanceRequestSchema,
  CreateSessionRequestSchema,
  MessageRequestSchema,
} from '@minimal-rpg/schemas';
import type { LoadedData } from '../../../loaders/types.js';
import { getEntityProfile } from '@minimal-rpg/db/node';
import { extractJsonField } from '@minimal-rpg/utils';
import { isUuid, toId } from '../../../utils/uuid.js';

export { MessageRequestSchema, CreateSessionRequestSchema, CreateNpcInstanceRequestSchema };

/**
 * Extract name field from profile JSON string.
 */
export function tryParseName(profileJson: string | undefined): string | undefined {
  return extractJsonField<string>(profileJson, 'name');
}

/**
 * Find character profile from filesystem or database.
 */
export async function findCharacter(
  loaded: LoadedData,
  id: string
): Promise<CharacterProfile | null> {
  const fsChar = loaded.characters.find((c) => c.id === id);
  if (fsChar) return fsChar;

  if (!isUuid(id)) {
    return null;
  }

  const dbChar = await getEntityProfile(toId(id));
  if (dbChar?.entityType === 'character') {
    try {
      return CharacterProfileSchema.parse(dbChar.profileJson);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Find setting profile from filesystem or database.
 */
export async function findSetting(loaded: LoadedData, id: string): Promise<SettingProfile | null> {
  const fsSet = loaded.settings.find((s) => s.id === id);
  if (fsSet) return fsSet;

  // `entity_profiles.id` is UUID. Avoid passing legacy/non-UUID ids into the DB layer,
  // which would otherwise bubble up as a Postgres 22P02 and surface as a 500.
  if (!isUuid(id)) {
    return null;
  }

  const dbSet = await getEntityProfile(toId(id));
  if (dbSet?.entityType === 'setting') {
    try {
      return SettingProfileSchema.parse(dbSet.profileJson);
    } catch {
      return null;
    }
  }
  return null;
}
