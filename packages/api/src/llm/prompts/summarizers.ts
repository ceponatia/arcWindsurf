import type { DbMessage } from '../../db/types.js';

/**
 * Summarize conversation history, keeping the most recent messages verbatim
 * and condensing older messages into a summary.
 *
 * @param messages - All messages in chronological order
 * @param keepLast - Number of recent messages to keep verbatim
 * @param maxChars - Maximum character length for the summary
 * @returns Summary string of older messages, or empty if no summarization needed
 */
export function summarizeHistory(
  messages: DbMessage[],
  keepLast: number,
  maxChars: number
): string {
  if (messages.length <= keepLast) return '';
  const older = messages.slice(0, Math.max(0, messages.length - keepLast));

  // Prioritize the most recent of the "older" messages by processing in reverse
  const reversedOlder = [...older].reverse();
  const keyPoints: string[] = [];
  let currentLen = 0;

  for (const m of reversedOlder) {
    const prefix = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Narration' : 'System';
    // Keep more content (500 chars) to preserve context
    const content = m.content.replace(/\s+/g, ' ');
    const line = content.length > 500 ? content.slice(0, 499) + '…' : content;
    const entry = `${prefix}: ${line}`;

    if (currentLen + entry.length + 1 > maxChars) break;

    keyPoints.push(entry);
    currentLen += entry.length + 1;
  }

  // Reverse back to chronological order
  return keyPoints.reverse().join('\n');
}
