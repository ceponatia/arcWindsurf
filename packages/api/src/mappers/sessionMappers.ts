import type { MapSessionListItem } from '../sessions/types.js';

export const mapSessionListItem: MapSessionListItem = (s, characterName, settingName) => {
  const base = {
    id: s.id,
    characterTemplateId: s.characterTemplateId,
    characterInstanceId: s.characterInstanceId ?? null,
    settingTemplateId: s.settingTemplateId,
    settingInstanceId: s.settingInstanceId ?? null,
    createdAt: s.createdAt,
  };
  if (characterName) Object.assign(base, { characterName });
  if (settingName) Object.assign(base, { settingName });
  return base;
};
