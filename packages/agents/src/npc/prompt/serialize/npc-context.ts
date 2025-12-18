import type { NpcContextSlice } from '../../types.js';

/**
 * Serialize NPC context (availability, awareness, mood) into prompt text.
 */
export function serializeNpcContext(npcContext: NpcContextSlice | null): string[] {
  if (!npcContext) return [];

  const lines: string[] = [];

  if (npcContext.schedule && !npcContext.schedule.available) {
    lines.push('\n--- AVAILABILITY ---');
    lines.push(`Availability: unavailable (${npcContext.schedule.unavailableReason})`);
    lines.push(
      'Rule: You may briefly acknowledge the player but should indicate you cannot talk now.'
    );
  }

  if (npcContext.awareness) {
    const awareness = npcContext.awareness;
    if (!awareness.hasMet) {
      lines.push('\n--- FIRST MEETING ---');
      lines.push('Awareness: first meeting');
      lines.push('Rule: Introduce yourself appropriately.');
    } else if (awareness.interactionCount && awareness.interactionCount > 10) {
      lines.push('\n--- ESTABLISHED RELATIONSHIP ---');
      lines.push(`Awareness: established (${awareness.interactionCount} interactions)`);
      lines.push('Rule: You know them well and can reference past conversations naturally.');
    }
  }

  if (npcContext.mood) {
    const intensity = npcContext.mood.intensity?.toFixed(1) ?? '0.5';
    lines.push(`Mood: ${npcContext.mood.primary} (${intensity})`);
  }

  return lines;
}
