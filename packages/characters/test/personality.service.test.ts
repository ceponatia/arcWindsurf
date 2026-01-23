import { describe, it, expect } from 'vitest';
import type { PersonalityMap } from '@minimal-rpg/schemas';
import { PersonalityService } from '../src/personality/service.js';
import type { PersonalityRepository } from '../src/personality/types.js';

class InMemoryPersonalityRepository implements PersonalityRepository {
  private map: PersonalityMap | null = null;

  async getPersonality(_characterId: string): Promise<PersonalityMap | null> {
    return this.map;
  }

  async savePersonality(_characterId: string, personality: PersonalityMap): Promise<PersonalityMap> {
    this.map = personality;
    return personality;
  }
}

describe('PersonalityService', () => {
  it('fetches and saves personality maps', async () => {
    const repository = new InMemoryPersonalityRepository();
    const service = new PersonalityService({ repository });

    expect(await service.getPersonality('char-1')).toBeNull();

    const saved = await service.savePersonality('char-1', { traits: ['kind'] } as PersonalityMap);
    const fetched = await service.getPersonality('char-1');

    expect(saved).toEqual({ traits: ['kind'] });
    expect(fetched).toEqual({ traits: ['kind'] });
  });
});
