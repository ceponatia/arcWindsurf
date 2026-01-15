import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { PerceptionContext, NpcActorState } from './types.js';

export const NPC_DECISION_SYSTEM_PROMPT = [
  'You decide how an NPC should act based on recent events and their personality.',
  'If no action is appropriate, respond with NO_ACTION.',
  'Otherwise, provide a short in-character line of dialogue to say next.',
  'Keep responses concise (max 20 words). Do not include narration.',
].join('\n');

export function buildNpcCognitionPrompt(
  perception: PerceptionContext,
  state: NpcActorState,
  profile: CharacterProfile
): string {
  const lines: string[] = [];

  lines.push(`NPC: ${profile.name ?? state.npcId}`);
  if (profile.personalityMap?.traits?.length) {
    lines.push(`Traits: ${profile.personalityMap.traits.join(', ')}`);
  }
  if (profile.personalityMap?.speech?.directness) {
    lines.push(`Speech: ${profile.personalityMap.speech.directness}`);
  }
  if (profile.summary) {
    lines.push(`Summary: ${profile.summary}`);
  }
  if (profile.backstory) {
    lines.push(`Backstory: ${profile.backstory.slice(0, 200)}`);
  }

  lines.push('Recent events:');
  if (perception.relevantEvents.length === 0) {
    lines.push('- None');
  } else {
    perception.relevantEvents.slice(-5).forEach((event) => {
      const actorIdValue = (event as Record<string, unknown>)['actorId'];
      const actorId = typeof actorIdValue === 'string' ? actorIdValue : 'unknown';
      lines.push(`- ${event.type} from ${actorId}`);
    });
  }

  lines.push('Instruction: Decide the next thing the NPC should say.');

  return lines.join('\n');
}
