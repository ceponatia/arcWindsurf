import type { CharacterProfile } from '@minimal-rpg/schemas';
import { API_BASE_URL } from '../../../config.js';
import { getAccessToken } from '../../../shared/auth/accessToken.js';

export interface StudioConversationInput {
  sessionId?: string;
  profile: Partial<CharacterProfile>;
  message: string;
}

export interface StudioConversationResponse {
  ok: boolean;
  sessionId: string;
  response: string;
  thought?: string;
  inferredTraits: Array<{
    path: string;
    value: unknown;
    confidence: number;
    evidence: string;
  }>;
  suggestedPrompts: Array<{
    prompt: string;
    topic: string;
    rationale: string;
  }>;
  meta: {
    messageCount: number;
    summarized: boolean;
    exploredTopics: string[];
  };
}

export async function studioConversation(
  input: StudioConversationInput
): Promise<StudioConversationResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/conversation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      sessionId: input.sessionId,
      profile: input.profile,
      message: input.message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<StudioConversationResponse>;
}

export interface SuggestPromptInput {
  profile: Partial<CharacterProfile>;
  exploredTopics?: string[];
}

export interface SuggestPromptResponse {
  ok: boolean;
  topic: string;
  prompts: Array<{
    prompt: string;
    topic: string;
    rationale: string;
  }>;
  unexploredTopics: string[];
}

export async function suggestPrompts(
  input: SuggestPromptInput
): Promise<SuggestPromptResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/suggest-prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<SuggestPromptResponse>;
}

export interface DilemmaInput {
  sessionId: string;
  profile: Partial<CharacterProfile>;
}

export async function generateDilemma(
  input: DilemmaInput
): Promise<StudioConversationResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/dilemma`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<StudioConversationResponse>;
}

export async function deleteStudioSession(sessionId: string): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/session/${sessionId}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.status}`);
  }
}
