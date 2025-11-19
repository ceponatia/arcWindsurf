import type { MapSessionListItem } from '../types.js';

export const mapSessionListItem: MapSessionListItem = (s, characterName, settingName) => {
  const base = {
    id: s.id,
    characterId: s.characterId,
    settingId: s.settingId,
    createdAt: s.createdAt,
  };
  if (characterName) Object.assign(base, { characterName });
  if (settingName) Object.assign(base, { settingName });
  return base;
};
