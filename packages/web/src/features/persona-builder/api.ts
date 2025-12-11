import type { PersonaProfile } from '@minimal-rpg/schemas';
import {
  deletePersona as apiDeletePersona,
  getPersona,
  savePersona,
} from '../../shared/api/client.js';

export function loadPersona(id: string, signal?: AbortSignal) {
  return getPersona(id, signal);
}

export function persistPersona(profile: PersonaProfile, signal?: AbortSignal) {
  return savePersona(profile, signal);
}

export function removePersona(id: string, signal?: AbortSignal) {
  return apiDeletePersona(id, signal);
}
