import { describe, it, expect } from 'vitest';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { ProfileService } from '../src/profile/service.js';
import type { ProfileRepository } from '../src/profile/types.js';

class InMemoryProfileRepository implements ProfileRepository {
  private profile: CharacterProfile | null = null;

  async getProfile(_characterId: string): Promise<CharacterProfile | null> {
    return this.profile;
  }

  async saveProfile(_characterId: string, profile: CharacterProfile): Promise<CharacterProfile> {
    this.profile = profile;
    return profile;
  }
}

describe('ProfileService', () => {
  it('fetches and saves profiles', async () => {
    const repository = new InMemoryProfileRepository();
    const service = new ProfileService({ repository });

    expect(await service.getProfile('char-1')).toBeNull();

    const saved = await service.saveProfile('char-1', { name: 'Hero' } as CharacterProfile);
    const fetched = await service.getProfile('char-1');

    expect(saved).toEqual({ name: 'Hero' });
    expect(fetched).toEqual({ name: 'Hero' });
  });
});
