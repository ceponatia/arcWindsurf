import type { CharacterProfile, SettingProfile, ItemCategory } from '@minimal-rpg/schemas';

// Loaded data (characters + settings)
export interface LoadedData {
  characters: CharacterProfile[];
  settings: SettingProfile[];
}
export type LoadedDataGetter = () => LoadedData | undefined;

// Profile summaries (DTOs)
export interface CharacterSummary {
  id: string;
  name: string;
  summary: string;
  tags?: string[];
  source: 'fs' | 'db';
}
export interface SettingSummary {
  id: string;
  name: string;
  source: 'fs' | 'db';
}
export interface PersonaSummary {
  id: string;
  name: string;
  summary: string;
  source: 'db';
}

// Item summary (DTO)
export interface ItemSummary {
  id: string;
  name: string;
  category: ItemCategory;
  type: string;
  description: string;
  tags?: string[];
}

// Mapper function signatures for discoverability
export type MapCharacterSummary = (c: CharacterProfile, source: 'fs' | 'db') => CharacterSummary;
export type MapSettingSummary = (s: SettingProfile, source: 'fs' | 'db') => SettingSummary;
export type MapItemSummary = (item: import('@minimal-rpg/schemas').ItemDefinition) => ItemSummary;
