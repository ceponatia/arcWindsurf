import type { AgentInput } from '../core/types.js';
import type { CharacterInstanceAffinity } from '@minimal-rpg/schemas';
import { buildAffinityContext } from '@minimal-rpg/schemas';

/**
 * Extract affinity/relationship context from input state slices.
 */
export function extractAffinityContext(
  input: AgentInput
): ReturnType<typeof buildAffinityContext> | null {
  const npc = input.stateSlices.npc ?? input.stateSlices.character;
  if (!npc?.instanceId) return null;

  const slices = input.stateSlices as Record<string, unknown>;
  const affinityMap = slices['affinity'] as Record<string, unknown> | undefined;
  if (!affinityMap) return null;

  const affinityState = affinityMap[npc.instanceId] as CharacterInstanceAffinity | undefined;
  if (!affinityState?.scores) return null;

  return buildAffinityContext(affinityState.scores);
}

/**
 * Behavioral guidance based on disposition level.
 */
export function getDispositionGuidance(disposition: string): string {
  switch (disposition) {
    case 'hostile':
      return 'Be cold, dismissive, or actively antagonistic. You do not like this person.';
    case 'unfriendly':
      return 'Be distant and guarded. Keep responses short and unenthusiastic.';
    case 'neutral':
      return 'Be polite but not warm. Treat them as you would any stranger.';
    case 'friendly':
      return 'Be warm and open. You enjoy talking to this person.';
    case 'close':
      return 'Be affectionate and familiar. You consider this person a good friend.';
    case 'devoted':
      return 'Be deeply warm and caring. This person means a great deal to you.';
    default:
      return 'Respond naturally based on the conversation context.';
  }
}
