/**
 * Build the formatting contract that constrains narrative POV and structure.
 */
export function buildFormattingContract(): string {
  return [
    '--- FORMAT ---',
    '- POV: third person for all narration; first person only inside quoted speech.',
    '- No name prefix.',
    '- Quotes only around speech; actions in *asterisks* without quotes.',
    '- Keep it concise: 1-3 sentences.',
    'Example: *She giggles softly.* "I love that!"',
  ].join('\n');
}
