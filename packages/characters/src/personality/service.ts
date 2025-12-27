import type { PersonalityMap } from '@minimal-rpg/schemas';
import type { PersonalityRepository, PersonalityServiceDeps } from './types.js';

export class PersonalityService {
  private readonly repository: PersonalityRepository;

  constructor(deps: PersonalityServiceDeps) {
    this.repository = deps.repository;
  }

  async getPersonality(characterId: string): Promise<PersonalityMap | null> {
    return this.repository.getPersonality(characterId);
  }

  async savePersonality(characterId: string, personality: PersonalityMap): Promise<PersonalityMap> {
    return this.repository.savePersonality(characterId, personality);
  }
}
