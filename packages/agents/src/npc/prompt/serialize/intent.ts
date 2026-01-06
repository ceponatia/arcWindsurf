import type { AgentIntent, IntentSegment } from '../../../core/types.js';

/**
 * Serialize guidance for compound/segmented intents.
 */
export function serializeSegmentGuidance(segments: IntentSegment[]): string[] {
  const lines: string[] = [];

  const hasTalk = segments.some((s) => s.type === 'talk');
  const hasThought = segments.some((s) => s.type === 'thought');
  const hasAction = segments.some((s) => s.type === 'action');
  const hasEmote = segments.some((s) => s.type === 'emote');
  const hasSensory = segments.some((s) => s.type === 'sensory');

  if (hasThought) {
    lines.push('- THOUGHT: Aware of mood/body language only; you cannot know their thoughts.');
  }
  if (hasAction) {
    lines.push('- ACTION: React to what they physically do.');
  }
  if (hasEmote) {
    lines.push('- EMOTE: Respond to visible emotional cues.');
  }
  if (hasTalk) {
    lines.push('- SPEECH: Reply with dialogue.');
  }
  if (hasSensory) {
    lines.push('- SENSORY: Player senses details; react naturally if relevant.');
  }

  lines.push('You may include actions (in *asterisks*) alongside or instead of dialogue.');

  return lines;
}

/**
 * Serialize intent-specific guidance for the system prompt.
 */
export function serializeIntentGuidance(intent?: AgentIntent): string[] {
  if (!intent) return [];

  if (intent.segments?.length) {
    const lines: string[] = [];
    lines.push('\n--- COMPOUND INPUT ---');
    lines.push('React to ALL segments naturally, in order:');
    lines.push(...serializeSegmentGuidance(intent.segments));
    return lines;
  }

  if (intent.type === 'narrate') {
    const narrateType = intent.params.narrateType;
    if (!narrateType) return [];

    const lines: string[] = [];
    lines.push('\n--- RESPONSE CONTEXT ---');

    switch (narrateType) {
      case 'thought':
        lines.push('Player shared an INTERNAL THOUGHT. You can infer mood/body language only.');
        break;
      case 'action':
        lines.push('Player described a PHYSICAL ACTION. React to what they did.');
        break;
      case 'emote':
        lines.push('Player described an EMOTIONAL REACTION. Respond to visible cues.');
        break;
      case 'narrative':
        lines.push('Player provided NARRATIVE context. Continue naturally and react in character.');
        break;
    }

    lines.push('Actions in *asterisks* are allowed alongside dialogue.');
    return lines;
  }

  return [];
}
