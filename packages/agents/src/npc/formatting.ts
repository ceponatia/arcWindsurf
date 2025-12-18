import type {
  AgentInput,
  CharacterSlice,
  KnowledgeContextItem,
  IntentSegment,
} from '../core/types.js';

export function formatDialogueResponse(characterName: string, response: string): string {
  let cleaned = response.trim();

  const namePatterns = [
    new RegExp(`^${characterName}:\\s*`, 'i'),
    new RegExp(`^${characterName.split(' ')[0]}:\\s*`, 'i'),
    new RegExp(`^\\*?${characterName}\\*?:\\s*`, 'i'),
  ];
  for (const pattern of namePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    const inner = cleaned.slice(1, -1);
    if (inner.startsWith('*') || inner.includes('*')) {
      cleaned = inner;
    }
  }

  return cleaned;
}

export function findRelevantContext(input: AgentInput): KnowledgeContextItem[] {
  if (!input.knowledgeContext) return [];
  return [...input.knowledgeContext].sort((a, b) => b.score - a.score).slice(0, 3);
}

export function generateContextualResponse(contextInfo: string): string {
  const responses = [
    'Ah, yes... I know something about that.',
    'Let me think about that...',
    "That's an interesting question.",
    'Hmm, I have some thoughts on that.',
  ];

  const index = contextInfo.length % responses.length;
  return responses[index] ?? responses[0] ?? '';
}

export function generateFallbackDialogue(character: CharacterSlice): string {
  const greetings = [
    `${character.name} nods in acknowledgment.`,
    `${character.name} regards you thoughtfully.`,
    `${character.name} pauses before speaking.`,
    `${character.name} looks at you with interest.`,
  ];

  const index = character.name.length % greetings.length;
  return greetings[index] ?? greetings[0] ?? '';
}

export function getSegmentLabel(segment: IntentSegment): string {
  switch (segment.type) {
    case 'talk':
      return 'SPEECH';
    case 'action':
      return 'ACTION';
    case 'thought':
      return 'THOUGHT';
    case 'emote':
      return 'EMOTE';
    case 'sensory':
      return segment.sensoryType?.toUpperCase() ?? 'SENSORY';
    default:
      return 'NARRATION';
  }
}
