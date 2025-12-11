/**
 * Session list handler
 * GET /sessions
 */
import type { Context } from 'hono';
import { CharacterProfileSchema, SettingProfileSchema } from '@minimal-rpg/schemas';
import { listSessions } from '../../db/sessionsClient.js';
import { db } from '../../db/prismaClient.js';
import type { LoadedDataGetter } from '../../data/types.js';
import type { SessionListItem } from '../../sessions/types.js';
import { mapSessionListItem } from '../../mappers/sessionMappers.js';

export async function handleListSessions(
  c: Context,
  getLoaded: LoadedDataGetter
): Promise<Response> {
  const sessions = await listSessions();
  const loaded = getLoaded();
  if (!loaded) return c.json(sessions, 200);

  const dbChars = await db.characterProfile.findMany();
  const dbSettings = await db.settingProfile.findMany();

  const decorated: SessionListItem[] = await Promise.all(
    sessions.map(async (sess) => {
      let characterName: string | undefined;
      let settingName: string | undefined;

      const fsCharacter = loaded.characters.find((ch) => ch.id === sess.characterTemplateId);
      if (fsCharacter) {
        characterName = fsCharacter.name;
      } else {
        const t = dbChars.find((t) => t.id === sess.characterTemplateId);
        if (t) {
          try {
            characterName = CharacterProfileSchema.parse(JSON.parse(t.profileJson)).name;
          } catch {
            // ignore invalid profile
          }
        } else if (sess.characterInstanceId) {
          const instance = await db.characterInstance.findUnique({
            where: { sessionId: sess.id },
          });
          if (instance) {
            try {
              const parsed = CharacterProfileSchema.parse(JSON.parse(instance.profileJson));
              characterName = parsed.name;
            } catch {
              // ignore invalid profile
            }
          }
        }
      }

      const fsSetting = loaded.settings.find((s) => s.id === sess.settingTemplateId);
      if (fsSetting) {
        settingName = fsSetting.name;
      } else {
        const t = dbSettings.find((t) => t.id === sess.settingTemplateId);
        if (t) {
          try {
            settingName = SettingProfileSchema.parse(JSON.parse(t.profileJson)).name;
          } catch {
            // ignore invalid profile
          }
        } else if (sess.settingInstanceId) {
          const instance = await db.settingInstance.findUnique({ where: { sessionId: sess.id } });
          if (instance) {
            try {
              const parsed = SettingProfileSchema.parse(JSON.parse(instance.profileJson));
              settingName = parsed.name;
            } catch {
              // ignore invalid profile
            }
          }
        }
      }

      return mapSessionListItem(sess, characterName, settingName);
    })
  );

  return c.json(decorated, 200);
}
