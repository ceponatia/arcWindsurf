import type { Physique } from '@minimal-rpg/schemas';
import type { CharacterId } from '../types.js';

export interface AppearanceProfile {
  physique?: Physique | string;
  profilePic?: string;
  emotePic?: string;
}

export interface AppearanceRepository {
  getAppearance(characterId: CharacterId): Promise<AppearanceProfile | null>;
  saveAppearance(characterId: CharacterId, profile: AppearanceProfile): Promise<AppearanceProfile>;
}

export interface AppearanceServiceDeps {
  repository: AppearanceRepository;
}
