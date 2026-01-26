import { getActorState, getEntityProfile } from '@minimal-rpg/db/node';
import { isUuid, toId, toSessionId } from '../../../utils/uuid.js';
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
    /**
     * Resolve actor display name using actor state, with profile fallback.
     */
    getActorDisplayName: async (actorId: string): Promise<string | null> => {
      const actorState = await getActorState(toSessionId(sessionId), actorId);
      if (!actorState) return null;

      const state = actorState.state as Record<string, unknown>;
      const stateName = typeof state['name'] === 'string' ? state['name'] : null;
      if (stateName) return stateName;

      const stateLabel = typeof state['label'] === 'string' ? state['label'] : null;
      if (stateLabel) return stateLabel;

      if (actorState.entityProfileId) {
        const profile = await getEntityProfile(actorState.entityProfileId);
        return profile?.name ?? null;
      }

      return null;
    },
  };
}
