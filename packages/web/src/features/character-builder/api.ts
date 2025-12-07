import type { CharacterProfile } from '@minimal-rpg/schemas';
import {
  deleteCharacter as apiDeleteCharacter,
  getCharacter,
  saveCharacter,
} from '../../shared/api/client.js';

export function loadCharacter(id: string, signal?: AbortSignal) {
  return getCharacter(id, signal);
}

export function persistCharacter(profile: CharacterProfile, signal?: AbortSignal) {
  return saveCharacter(profile, signal);
}

export function removeCharacter(id: string, signal?: AbortSignal) {
  return apiDeleteCharacter(id, signal);
}
