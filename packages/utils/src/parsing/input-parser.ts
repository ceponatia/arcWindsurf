import type { ParsedPlayerInput, ParsedSegment } from '@minimal-rpg/schemas';

/**
 * Deterministically parses player input into segments based on markers.
 *
 * Conventions:
 * - Plain text → speech (observable)
 * - ~text~ → thought (not observable)
 * - *text* → action (observable)
 *
 * @param input - Raw player input string
 * @returns Parsed input with segments
 */
export function parsePlayerInput(input: string): ParsedPlayerInput {
  const segments: ParsedSegment[] = [];

  // Regex to match ~thought~, *action*, and plain text
  const pattern = /~([^~]+)~|\*([^*]+)\*|([^~*]+)/g;
  let match;
  let order = 0;

  while ((match = pattern.exec(input)) !== null) {
    const [, thought, action, speech] = match;

    if (thought) {
      segments.push({
        id: `seg-${order++}`,
        type: 'thought',
        content: thought.trim(),
        observable: false,
        rawMarkers: { prefix: '~', suffix: '~' },
      });
    } else if (action) {
      segments.push({
        id: `seg-${order++}`,
        type: 'action',
        content: action.trim(),
        observable: true,
        rawMarkers: { prefix: '*', suffix: '*' },
      });
    } else if (speech?.trim()) {
      segments.push({
        id: `seg-${order++}`,
        type: 'speech',
        content: speech.trim(),
        observable: true,
      });
    }
  }

  return { rawInput: input, segments };
}
