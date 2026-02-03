import {
  getCharacter,
  saveCharacter,
  deleteCharacter as apiDeleteCharacter,
} from '../../../shared/api/client.js';
import { generateId } from '@minimal-rpg/utils';

// Re-export from shared API client (reuse existing functions)
export const loadCharacter = getCharacter;
export const persistCharacter = saveCharacter;
export const removeCharacter = apiDeleteCharacter;

// Generate a unique ID for new characters
export function generateCharacterId(): string {
  return generateId();
}
