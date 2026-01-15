import { getRecordOptional, setRecord } from '@minimal-rpg/schemas';
import type { InferredTrait, ConversationMessage } from '../signals.js';

/**
 * Simple client-side trait inference based on keyword matching.
 * This is a fallback when the API is unavailable.
 */
export function inferTraitsFromKeywords(
  message: string
): Omit<InferredTrait, 'status'>[] {
  const traits: Omit<InferredTrait, 'status'>[] = [];
  const lower = message.toLowerCase();

  // Fear detection
  const fearPatterns = [
    { pattern: /afraid of|fear|scared of|terrif/i, category: 'general' },
    { pattern: /alone|lonely|abandoned/i, category: 'abandonment' },
    { pattern: /fail|failure|disappoint/i, category: 'failure' },
    { pattern: /forgot|irrelevant|invisible/i, category: 'exposure' },
  ];

  for (const { pattern, category } of fearPatterns) {
    if (pattern.test(message)) {
      traits.push({
        id: Math.random().toString(36).slice(2),
        path: 'personalityMap.fears',
        value: { category, specific: extractFearSpecific(message) },
        confidence: 0.6,
        evidence: message.slice(0, 100),
      });
      break;
    }
  }

  // Value detection
  const valuePatterns = [
    { pattern: /honest|truth|integrity/i, value: 'honesty' },
    { pattern: /loyal|trust|faithful/i, value: 'loyalty' },
    { pattern: /family|loved ones|children/i, value: 'family' },
    { pattern: /freedom|independen|autonomy/i, value: 'freedom' },
    { pattern: /knowledge|learn|understand/i, value: 'knowledge' },
  ];

  for (const { pattern, value } of valuePatterns) {
    if (pattern.test(message)) {
      traits.push({
        id: Math.random().toString(36).slice(2),
        path: 'personalityMap.values',
        value: { value, priority: 5 },
        confidence: 0.5,
        evidence: message.slice(0, 100),
      });
    }
  }

  // Social pattern detection
  if (/stranger|don't know|new people/i.test(lower)) {
    const isGuarded = /careful|cautious|wary|suspicious/i.test(lower);
    const isFriendly = /open|friendly|welcoming/i.test(lower);

    if (isGuarded) {
      traits.push({
        id: Math.random().toString(36).slice(2),
        path: 'personalityMap.social.strangerDefault',
        value: 'guarded',
        confidence: 0.7,
        evidence: message.slice(0, 100),
      });
    } else if (isFriendly) {
      traits.push({
        id: Math.random().toString(36).slice(2),
        path: 'personalityMap.social.strangerDefault',
        value: 'open',
        confidence: 0.7,
        evidence: message.slice(0, 100),
      });
    }
  }

  return traits;
}

function extractFearSpecific(message: string): string {
  // Simple extraction - take the phrase after "afraid of" or "fear of"
  const match = /(?:afraid of|fear of|scared of)\s+([^.!?,]+)/i.exec(message);
  return match?.[1]?.trim() ?? 'unspecified';
}

/**
 * Analyze conversation history for recurring themes.
 */
export function analyzeConversationThemes(
  history: ConversationMessage[]
): { theme: string; frequency: number }[] {
  const themes: Record<string, number> = {};

  for (const msg of history) {
    if (msg.role !== 'character') continue;

    // Count recurring words/phrases (simplified)
    const words = msg.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 5) {
        const count = getRecordOptional(themes, word) ?? 0;
        setRecord(themes, word, count + 1);
      }
    }
  }

  return Object.entries(themes)
    .filter(([, count]) => count > 2)
    .map(([theme, frequency]) => ({ theme, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}
