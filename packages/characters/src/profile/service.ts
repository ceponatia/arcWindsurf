import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { ProfileRepository, ProfileServiceDeps } from './types.js';

export class ProfileService {
  private readonly repository: ProfileRepository;

  constructor(deps: ProfileServiceDeps) {
    this.repository = deps.repository;
  }

  async getProfile(characterId: string): Promise<CharacterProfile | null> {
    return this.repository.getProfile(characterId);
  }

  async saveProfile(characterId: string, profile: CharacterProfile): Promise<CharacterProfile> {
    return this.repository.saveProfile(characterId, profile);
  }
}
