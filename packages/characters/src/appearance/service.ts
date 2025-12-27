import type { AppearanceProfile, AppearanceRepository, AppearanceServiceDeps } from './types.js';

export class AppearanceService {
  private readonly repository: AppearanceRepository;

  constructor(deps: AppearanceServiceDeps) {
    this.repository = deps.repository;
  }

  async getAppearance(characterId: string): Promise<AppearanceProfile | null> {
    return this.repository.getAppearance(characterId);
  }

  async saveAppearance(
    characterId: string,
    profile: AppearanceProfile
  ): Promise<AppearanceProfile> {
    return this.repository.saveAppearance(characterId, profile);
  }
}
