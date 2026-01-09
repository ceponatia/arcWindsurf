import type { Context } from 'hono';
import { listSessions, getEntityProfile } from '@minimal-rpg/db/node';
import { getOwnerEmail } from '../../../auth/ownerEmail.js';
import { toId } from '../../../utils/uuid.js';

export async function handleListSessions(c: Context): Promise<Response> {
  const ownerEmail = getOwnerEmail(c);
  const sessions = await listSessions(ownerEmail);

  const decorated = await Promise.all(
    sessions.map(async (sess) => {
      let characterName: string | undefined;
      let settingName: string | undefined;

      if (sess.playerCharacterId) {
        const char = await getEntityProfile(toId(sess.playerCharacterId));
        characterName = char?.name;
      }
      if (sess.settingId) {
        const setting = await getEntityProfile(toId(sess.settingId));
        settingName = setting?.name;
      }

      return {
        id: sess.id,
        name: sess.name,
        playerCharacterId: sess.playerCharacterId,
        settingId: sess.settingId,
        characterName: characterName || 'Unknown Hero',
        settingName: settingName || 'Unknown World',
        status: sess.status,
        createdAt: sess.createdAt,
        updatedAt: sess.updatedAt,
      };
    })
  );

  return c.json(decorated, 200);
}
