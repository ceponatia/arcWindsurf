import type { MapSessionListItem } from '../services/types.js';

export const mapSessionListItem: MapSessionListItem = (s, characterName, settingName) => {
  const base = {
    id: s.id,
    characterTemplateId: s.playerCharacterId,
    characterInstanceId: null,
    settingTemplateId: s.settingId,
    settingInstanceId: null,
    createdAt: s.createdAt,
  };
  if (characterName) Object.assign(base, { characterName });
  if (settingName) Object.assign(base, { settingName });
  return base;
};
