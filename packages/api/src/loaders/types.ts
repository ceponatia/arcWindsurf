import type {
  CharacterProfile,
  SettingProfile,
  CharacterSummary,
  SettingSummary,
  ItemSummary,
  ItemDefinition,
} from '@minimal-rpg/schemas';

export type { CharacterSummary, SettingSummary, PersonaSummary, ItemSummary } from '@minimal-rpg/schemas';

// Loaded data (characters + settings)
export interface LoadedData {
  characters: CharacterProfile[];
  settings: SettingProfile[];
}
export type LoadedDataGetter = () => LoadedData | undefined;

// Mapper function signatures for discoverability
export type MapCharacterSummary = (c: CharacterProfile, source: 'fs' | 'db') => CharacterSummary;
export type MapSettingSummary = (s: SettingProfile, source: 'fs' | 'db') => SettingSummary;
export type MapItemSummary = (item: ItemDefinition) => ItemSummary;
