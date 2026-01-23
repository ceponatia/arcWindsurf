import { getEntityProfile } from '@minimal-rpg/db/node';
import { isUuid, toId } from '../../../utils/uuid.js';
import type { MessageMappingDeps } from './message-mapping.js';

/**
 * Creates dependencies for mapping persisted SPOKE events to API message DTOs.
 *
 * Centralizes speaker name resolution and prevents accidental DB calls with
 * legacy/non-UUID ids.
 */
export function createMessageMappingDeps(sessionId: string): MessageMappingDeps {
  return {
    sessionId,
    getProfileName: async (profileId: string): Promise<string | null> => {
      if (!isUuid(profileId)) return null;
      const profile = await getEntityProfile(toId(profileId));
      return profile?.name ?? null;
    },
  };
}
