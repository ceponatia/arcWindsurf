import type { CharacterProfile } from '@minimal-rpg/schemas';
import { getCharacter, saveCharacter } from '../../shared/api/client.js';

export function loadCharacter(id: string, signal?: AbortSignal) {
  return getCharacter(id, signal);
}

export function persistCharacter(profile: CharacterProfile, signal?: AbortSignal) {
  return saveCharacter(profile, signal);
}
