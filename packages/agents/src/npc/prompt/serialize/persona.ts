import type { PersonaProfile } from '@minimal-rpg/schemas';

/**
 * Serialize the player persona block.
 * Returns an empty list when there is no meaningful persona info.
 */
export function serializePersona(persona?: PersonaProfile): string[] {
  if (!persona) return [];

  const personaLines: string[] = [];
  if (persona.name) personaLines.push(`name: ${persona.name}`);
  if (persona.age !== undefined) personaLines.push(`age: ${persona.age}`);
  if (persona.gender) personaLines.push(`gender: ${persona.gender}`);
  if (persona.summary) personaLines.push(`summary: ${persona.summary}`);

  if (persona.appearance) {
    const appearance = persona.appearance;
    const appearanceDescription =
      typeof appearance === 'string'
        ? appearance
        : `${appearance.build.height} height, ${appearance.build.torso} torso, ${appearance.build.arms.build} arms, ${appearance.build.legs.build} legs`;
    personaLines.push(`appearance: ${appearanceDescription}`);
  }

  if (!personaLines.length) return [];

  const lines: string[] = [];
  lines.push('\n--- PLAYER CHARACTER ---');
  lines.push(...personaLines.map((line) => `- ${line}`));
  lines.push('Note: this describes the USER, not your character.');
  return lines;
}
