import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { CharacterId } from '../types.js';

export interface ProfileRepository {
  getProfile(characterId: CharacterId): Promise<CharacterProfile | null>;
  saveProfile(characterId: CharacterId, profile: CharacterProfile): Promise<CharacterProfile>;
}

export interface ProfileServiceDeps {
  repository: ProfileRepository;
}
