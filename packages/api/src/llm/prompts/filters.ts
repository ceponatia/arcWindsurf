import type { ContentFilterResult } from '../types.js';

/**
 * Simple content filter to detect potentially sensitive content.
 * Returns a filter result with flagged status and optional note.
 *
 * @param latestUserText - The most recent user input to check
 * @returns Filter result indicating if content was flagged and safety note if applicable
 */
export function simpleContentFilter(latestUserText: string | undefined): ContentFilterResult {
  if (!latestUserText) return { flagged: false, note: '' };
  const text = latestUserText.toLowerCase();
  const banned = [
    /child abuse/,
    /sexual violence/,
    /bestiality/,
    /necrophilia/,
    /extreme gore/,
    /hate speech/,
  ];
  const flagged = banned.some((re) => re.test(text));
  if (!flagged) return { flagged: false, note: '' };
  const note =
    'Sensitive content detected: avoid explicit details, keep events implied or off-screen, and redirect respectfully.';
  try {
    console.warn('[safety] filtered sensitive request');
  } catch {
    // noop
  }
  return { flagged: true, note };
}
