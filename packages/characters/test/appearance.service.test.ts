import { describe, it, expect } from 'vitest';
import type { AppearanceProfile } from '../src/appearance/types.js';
import { AppearanceService } from '../src/appearance/service.js';
import type { AppearanceRepository } from '../src/appearance/types.js';

class InMemoryAppearanceRepository implements AppearanceRepository {
  private profile: AppearanceProfile | null = null;

  async getAppearance(_characterId: string): Promise<AppearanceProfile | null> {
    return this.profile;
  }

  async saveAppearance(_characterId: string, profile: AppearanceProfile): Promise<AppearanceProfile> {
    this.profile = profile;
    return profile;
  }
}

describe('AppearanceService', () => {
  it('fetches and saves appearance profiles', async () => {
    const repository = new InMemoryAppearanceRepository();
    const service = new AppearanceService({ repository });

    expect(await service.getAppearance('char-1')).toBeNull();

    const saved = await service.saveAppearance('char-1', { profilePic: 'pic.png' });
    const fetched = await service.getAppearance('char-1');

    expect(saved).toEqual({ profilePic: 'pic.png' });
    expect(fetched).toEqual({ profilePic: 'pic.png' });
  });
});
