import type { BodyMap, BodyRegion, BodyRegionData } from '@minimal-rpg/schemas';
import type { BodyMapRepository, BodyMapServiceDeps } from './types.js';

export class BodyMapService {
  private readonly repository: BodyMapRepository;

  constructor(deps: BodyMapServiceDeps) {
    this.repository = deps.repository;
  }

  async getBodyMap(characterId: string): Promise<BodyMap | null> {
    return this.repository.getBodyMap(characterId);
  }

  async upsertBodyRegion(
    characterId: string,
    region: BodyRegion,
    data: BodyRegionData
  ): Promise<BodyMap> {
    return this.repository.upsertBodyRegion(characterId, region, data);
  }
}
