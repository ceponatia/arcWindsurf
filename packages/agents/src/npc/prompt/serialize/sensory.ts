import type { SensoryContextForNpc } from '@minimal-rpg/schemas';

/**
 * Serialize the sensory context block.
 * Returns an empty list when there is no sensory data to include.
 */
export function serializeSensoryContext(sc?: SensoryContextForNpc): string[] {
  if (!sc) return [];

  const hasSensoryData =
    sc.playerFocus ??
    sc.available.smell?.length ??
    sc.available.touch?.length ??
    sc.available.taste?.length ??
    sc.available.sound?.length ??
    sc.available.sight?.length ??
    sc.narrativeHints?.recentSensoryAction;

  if (!hasSensoryData) return [];

  const lines: string[] = [];
  lines.push('\n--- SENSORY CONTEXT (use when relevant) ---');

  if (sc.playerFocus) {
    lines.push(
      `Focus: ${sc.playerFocus.sense}` +
        (sc.playerFocus.target ? ` (${sc.playerFocus.target})` : '') +
        (sc.playerFocus.bodyPart ? ` - ${sc.playerFocus.bodyPart}` : '')
    );
  }

  if (sc.available.smell?.length) {
    lines.push('Smell:');
    lines.push(
      ...sc.available.smell.map(
        (s) => `- ${s.source}: ${s.description} (intensity: ${s.intensity})`
      )
    );
  }

  if (sc.available.touch?.length) {
    lines.push('Touch:');
    lines.push(
      ...sc.available.touch.map(
        (t) => `- ${t.source}: ${t.description} (intensity: ${t.intensity})`
      )
    );
  }

  if (sc.available.taste?.length) {
    lines.push('Taste:');
    lines.push(
      ...sc.available.taste.map(
        (t) => `- ${t.source}: ${t.description} (intensity: ${t.intensity})`
      )
    );
  }

  if (sc.available.sound?.length) {
    lines.push('Sound:');
    lines.push(...sc.available.sound.map((s) => `- ${s.source}: ${s.description}`));
  }

  if (sc.available.sight?.length) {
    lines.push('Sight:');
    lines.push(...sc.available.sight.map((s) => `- ${s.source}: ${s.description}`));
  }

  if (sc.narrativeHints?.recentSensoryAction) {
    lines.push('\n--- SENSORY NARRATION REQUIRED ---');
    lines.push('- Start with second-person sensory narration using data above.');
    lines.push('- Then add third-person NPC reaction.');
    lines.push('- Do not invent new sensory details.');
  } else {
    lines.push('Weave sensory details naturally when they enhance the response.');
    lines.push('Do not invent sensory details.');
  }

  return lines;
}
