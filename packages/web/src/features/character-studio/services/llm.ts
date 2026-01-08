import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { ConversationMessage, InferredTrait } from '../signals.js';
import { API_BASE_URL } from '../../../config.js';
import { getAccessToken } from '../../../shared/auth/accessToken.js';

export interface GenerateResponseInput {
  profile: Partial<CharacterProfile>;
  history: ConversationMessage[];
  userMessage: string;
}

export interface GenerateResponseOutput {
  content: string;
}

/**
 * Generate a character response via the API.
 * Uses the character's personality profile to inform the response.
 */
export async function generateCharacterResponse(
  input: GenerateResponseInput
): Promise<GenerateResponseOutput> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      profile: input.profile,
      history: input.history.map(m => ({
        role: m.role,
        content: m.content,
      })),
      userMessage: input.userMessage,
    }),
  });

  if (!response.ok) {
    throw new Error(`Generate failed: ${response.status}`);
  }

  const data = await response.json();
  return { content: data.content };
}

export interface InferTraitsInput {
  userMessage: string;
  characterResponse: string;
  currentProfile: Partial<CharacterProfile>;
}

/**
 * Infer personality traits from a conversation exchange.
 * Returns trait suggestions that can be accepted or rejected.
 */
export async function inferTraitsFromMessage(
  input: InferTraitsInput
): Promise<Omit<InferredTrait, 'status'>[]> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/infer-traits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    // Non-critical - return empty if inference fails
    console.warn('Trait inference failed:', response.status);
    return [];
  }

  const data = await response.json();
  return data.traits ?? [];
}
