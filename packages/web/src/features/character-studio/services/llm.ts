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
  sessionId?: string;
  dilemmaScenario?: string | null;
  response: string;
  thought?: string;
  inferredTraits: {
    path: string;
    value: unknown;
    confidence: number;
    evidence: string;
  }[];
  suggestedPrompts?: {
    prompt: string;
    topic: string;
    rationale: string;
  }[];
  meta?: {
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
    const errorData = await response
      .json()
      .then((data: unknown) => (typeof data === 'object' && data !== null ? data : {}))
      .catch(() => ({} as Record<string, unknown>));
    const errorValue = (errorData as { error?: unknown }).error;
    const message =
      typeof errorValue === 'string' ? errorValue : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<StudioConversationResponse>;
}

export interface StreamCallbacks {
  onSessionId?: (sessionId: string) => void;
  onContent?: (content: string) => void;
  onDone?: (response: StudioConversationResponse) => void;
  onError?: (error: string) => void;
}

export async function studioConversationStream(
  input: StudioConversationInput,
  callbacks: StreamCallbacks
): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/conversation/stream`, {
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
    const errorData = await response
      .json()
      .then((data: unknown) => (typeof data === 'object' && data !== null ? data : {}))
      .catch(() => ({} as Record<string, unknown>));
    const errorValue = (errorData as { error?: unknown }).error;
    const message =
      typeof errorValue === 'string' ? errorValue : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE messages (separated by double newlines)
    const messages = buffer.split('\n\n');
    buffer = messages.pop() ?? '';

    for (const message of messages) {
      if (!message.trim()) continue;

      const lines = message.split('\n');
      let eventType = '';
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataStr = line.slice(6);
        }
      }

      if (eventType && dataStr) {
        try {
          const data = JSON.parse(dataStr) as Record<string, unknown>;

          switch (eventType) {
            case 'session':
              callbacks.onSessionId?.(data['sessionId'] as string);
              break;
            case 'content':
              callbacks.onContent?.(data['content'] as string);
              break;
            case 'done':
              callbacks.onDone?.(data as unknown as StudioConversationResponse);
              break;
            case 'error':
              callbacks.onError?.(data['message'] as string);
              break;
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', dataStr, e);
        }
      }
    }
  }
}

export interface SuggestPromptInput {
  profile: Partial<CharacterProfile>;
  exploredTopics?: string[];
}

export interface SuggestPromptResponse {
  ok: boolean;
  topic: string;
  prompts: {
    prompt: string;
    topic: string;
    rationale: string;
  }[];
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

export interface DilemmaScenarioInput {
  profile: Partial<CharacterProfile>;
}

export interface DilemmaScenarioResponse {
  ok: boolean;
  scenario: string;
  conflictingValues: string[];
}

export async function generateDilemmaScenario(
  input: DilemmaScenarioInput
): Promise<DilemmaScenarioResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/dilemma/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<DilemmaScenarioResponse>;
}

export interface InferTraitsInput {
  sessionId: string;
  userMessage: string;
  characterResponse: string;
  profile: Partial<CharacterProfile>;
}

export interface InferTraitsResponse {
  ok: boolean;
  inferredTraits: {
    path: string;
    value: unknown;
    confidence: number;
    evidence: string;
    reasoning?: string;
  }[];
}

export async function inferTraits(
  input: InferTraitsInput
): Promise<InferTraitsResponse> {
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
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(error.error ?? `Trait inference failed: ${response.status}`);
  }

  return response.json() as Promise<InferTraitsResponse>;
}

export interface SummarizeResponse {
  ok: boolean;
  summarized: boolean;
  summary: string | null;
  messageCount?: number;
}

/**
 * Summarizes the conversation session.
 */
export async function summarizeConversation(
  sessionId: string
): Promise<SummarizeResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}/studio/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(error.error ?? `Summarization failed: ${response.status}`);
  }

  return response.json() as Promise<SummarizeResponse>;
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
