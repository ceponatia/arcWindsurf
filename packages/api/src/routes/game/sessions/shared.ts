/**
 * Shared utilities for session routes.
 */
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
} from '@minimal-rpg/schemas';
import type { LoadedData } from '../../../loaders/types.js';
import type { CreateSessionRequest, MessageRequest } from '../../../services/types.js';
import { getEntityProfile } from '@minimal-rpg/db/node';
import { extractJsonField } from '@minimal-rpg/utils';

// Type guards for request validation
export function isMessageRequest(body: unknown): body is MessageRequest {
  return Boolean(
    body && typeof body === 'object' && typeof (body as { content?: unknown }).content === 'string'
  );
}

export function isCreateSessionRequest(body: unknown): body is CreateSessionRequest {
  if (!body || typeof body !== 'object') return false;
  const { characterId, settingId } = body as {
    characterId?: unknown;
    settingId?: unknown;
  };
  return typeof characterId === 'string' && typeof settingId === 'string';
}

export interface CreateNpcInstanceRequest {
  templateId: string;
  role?: string;
  label?: string;
}

export function isCreateNpcInstanceRequest(body: unknown): body is CreateNpcInstanceRequest {
  if (!body || typeof body !== 'object') return false;
  const { templateId, role, label } = body as {
    templateId?: unknown;
    role?: unknown;
    label?: unknown;
  };
  const templateValid = typeof templateId === 'string' && templateId.trim().length > 0;
  const roleValid = role === undefined || typeof role === 'string';
  const labelValid = label === undefined || typeof label === 'string';
  return templateValid && roleValid && labelValid;
}

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

  const dbChar = await getEntityProfile(id as any);
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

  const dbSet = await getEntityProfile(id as any);
  if (dbSet?.entityType === 'setting') {
    try {
      return SettingProfileSchema.parse(dbSet.profileJson);
    } catch {
      return null;
    }
  }
  return null;
}
