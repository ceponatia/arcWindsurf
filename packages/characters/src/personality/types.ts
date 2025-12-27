import type { PersonalityMap } from '@minimal-rpg/schemas';
import type { CharacterId } from '../types.js';

export interface PersonalityRepository {
  getPersonality(characterId: CharacterId): Promise<PersonalityMap | null>;
  savePersonality(characterId: CharacterId, personality: PersonalityMap): Promise<PersonalityMap>;
}

export interface PersonalityServiceDeps {
  repository: PersonalityRepository;
}
