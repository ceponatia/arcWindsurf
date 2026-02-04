import type { ItemCategory } from '../items/index.js';

export type SummarySource = 'fs' | 'db';

export interface CharacterSummary {
  id: string;
  name: string;
  summary: string;
  archetype?: string | undefined;
  tags?: string[] | undefined;
  source?: SummarySource | undefined;
}

export interface SettingSummary {
  id: string;
  name: string;
  tone?: string | undefined;
  source?: SummarySource | undefined;
}

export interface PersonaSummary {
  id: string;
  name: string;
  summary: string;
  bio?: string | undefined;
  source?: 'db' | undefined;
}

export interface ItemSummary {
  id: string;
  name: string;
  category: ItemCategory;
  type: string;
  description: string;
  tags?: string[] | undefined;
}
