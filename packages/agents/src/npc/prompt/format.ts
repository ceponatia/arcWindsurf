import type { PromptLines } from './types.js';

/**
 * Format a standard prompt heading.
 *
 * @example
 * formatHeading('PLAYER CHARACTER')
 * // => "--- PLAYER CHARACTER ---"
 */
export function formatHeading(title: string): string {
  return `--- ${title} ---`;
}

/**
 * Create a bullet line.
 */
export function bullet(text: string): string {
  return `- ${text}`;
}

/**
 * Indent a single line by N spaces.
 */
export function indentLine(line: string, spaces: number): string {
  return `${' '.repeat(spaces)}${line}`;
}

/**
 * Indent multiple lines by N spaces.
 */
export function indentLines(lines: PromptLines, spaces: number): PromptLines {
  return lines.map((line) => indentLine(line, spaces));
}

/**
 * Truncate text to a maximum length, appending an ellipsis.
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return text.slice(0, maxChars);
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
}
