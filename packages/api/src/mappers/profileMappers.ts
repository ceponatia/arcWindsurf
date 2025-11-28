import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { CharacterSummary, MapCharacterSummary, MapSettingSummary } from '../types.js';

export const mapCharacterSummary: MapCharacterSummary = (c: CharacterProfile, source) => {
  const dto: CharacterSummary = {
    id: c.id,
    name: c.name,
    summary: c.summary,
    source,
  };
  if (c.tags && c.tags.length > 0) dto.tags = c.tags;
  return dto;
};

export const mapSettingSummary: MapSettingSummary = (s: SettingProfile, source) => ({
  id: s.id,
  name: s.name,
  source,
});
