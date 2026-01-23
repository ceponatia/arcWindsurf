import { describe, it, expect } from 'vitest';
import type { BodyMap, BodyRegionData } from '@minimal-rpg/schemas';
import { BodyMapService } from '../src/body-map/service.js';
import type { BodyMapRepository } from '../src/body-map/types.js';

class InMemoryBodyMapRepository implements BodyMapRepository {
  private map: BodyMap | null = null;

  async getBodyMap(_characterId: string): Promise<BodyMap | null> {
    return this.map;
  }

  async upsertBodyRegion(
    _characterId: string,
    region: string,
    data: BodyRegionData
  ): Promise<BodyMap> {
    const next = (this.map ?? {}) as Record<string, BodyRegionData>;
    next[region] = data;
    this.map = next as BodyMap;
    return this.map;
  }
}

describe('BodyMapService', () => {
  it('delegates to repository', async () => {
    const repository = new InMemoryBodyMapRepository();
    const service = new BodyMapService({ repository });

    const region = { cleanliness: 0, description: 'clean' } as BodyRegionData;

    const created = await service.upsertBodyRegion('char-1', 'head', region);
    const fetched = await service.getBodyMap('char-1');

    expect(created).toEqual({ head: region });
    expect(fetched).toEqual({ head: region });
  });
});
