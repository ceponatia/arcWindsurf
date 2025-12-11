import type { CharacterProfile, SettingProfile, PersonaProfile } from '@minimal-rpg/schemas';
import type {
  CharacterSummary,
  MapCharacterSummary,
  MapSettingSummary,
  PersonaSummary,
} from '../data/types.js';

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

export const mapPersonaSummary = (p: PersonaProfile): PersonaSummary => ({
  id: p.id,
  name: p.name,
  summary: p.summary,
  source: 'db',
});
