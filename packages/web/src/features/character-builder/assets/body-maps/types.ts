import type { BodyRegion } from '@minimal-rpg/schemas';

export interface BodyMapPath {
  region: BodyRegion;
  d: string;
}

export interface BodyMapDefinition {
  id: string;
  viewBox: string;
  paths: BodyMapPath[];
}
