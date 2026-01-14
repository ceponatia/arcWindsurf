# TASK-010: Frontend Integration

**Priority**: P0 (Blocking)
**Phase**: 1 - Core Actor
**Estimate**: 45 minutes
**Depends On**: TASK-009

---

## Objective

Update the frontend `useConversation` hook and signals to use the new `/studio/conversation` API endpoint with session management.

## Files to Modify

1. `packages/web/src/features/character-studio/signals.ts`
2. `packages/web/src/features/character-studio/hooks/useConversation.ts`
3. `packages/web/src/features/character-studio/services/llm.ts`

## Implementation

### Step 1: Update signals.ts

Add new signals for session management and suggested prompts:

```typescript
// Add to packages/web/src/features/character-studio/signals.ts

/** Current studio session ID */
export const studioSessionId = signal<string | null>(null);

/** Suggested prompts from discovery guide */
export const suggestedPrompts = signal<SuggestedPrompt[]>([]);

/** Explored topics in current session */
export const exploredTopics = signal<string[]>([]);

export interface SuggestedPrompt {
  prompt: string;
  topic: string;
  rationale: string;
}

/** Reset session state (call when starting new character) */
export function resetStudioSession(): void {
  studioSessionId.value = null;
  suggestedPrompts.value = [];
  exploredTopics.value = [];
  conversationHistory.value = [];
  pendingTraits.value = [];
}
```

### Step 2: Update llm.ts service

Add new API functions:

```typescript
// Add to packages/web/src/features/character-studio/services/llm.ts

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
```

### Step 3: Update useConversation.ts

Replace the implementation to use new API:

```typescript
// packages/web/src/features/character-studio/hooks/useConversation.ts
import { useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  conversationHistory,
  characterProfile,
  isGenerating,
  pendingTraits,
  studioSessionId,
  suggestedPrompts,
  exploredTopics,
  addMessage,
} from '../signals.js';
import { studioConversation, suggestPrompts } from '../services/llm.js';
import type { InferredTrait } from '../types.js';

export interface UseConversationResult {
  messages: typeof conversationHistory.value;
  isGenerating: boolean;
  suggestedPrompts: typeof suggestedPrompts.value;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
  loadSuggestedPrompts: () => Promise<void>;
}

export function useConversation(): UseConversationResult {
  useSignals();

  const sendMessage = useCallback(async (content: string) => {
    // Add user message immediately for UI
    addMessage({ role: 'user', content });
    isGenerating.value = true;

    try {
      const profile = characterProfile.value;

      // Call new conversation API
      const response = await studioConversation({
        sessionId: studioSessionId.value ?? undefined,
        profile,
        message: content,
      });

      // Store session ID for future requests
      studioSessionId.value = response.sessionId;

      // Add character response
      addMessage({
        role: 'character',
        content: response.response,
      });

      // Handle inferred traits
      if (response.inferredTraits.length > 0) {
        pendingTraits.value = [
          ...pendingTraits.value,
          ...response.inferredTraits.map(t => ({
            ...t,
            status: 'pending' as const,
          })),
        ];
      }

      // Update suggested prompts
      suggestedPrompts.value = response.suggestedPrompts;

      // Update explored topics
      exploredTopics.value = response.meta.exploredTopics;

    } catch (err) {
      console.error('Conversation error:', err);
      addMessage({
        role: 'system',
        content: 'Failed to generate response. Please try again.',
      });
    } finally {
      isGenerating.value = false;
    }
  }, []);

  const clearConversation = useCallback(() => {
    conversationHistory.value = [];
    pendingTraits.value = [];
    suggestedPrompts.value = [];
    exploredTopics.value = [];
    // Keep session ID - backend will handle clearing
  }, []);

  const loadSuggestedPrompts = useCallback(async () => {
    try {
      const response = await suggestPrompts({
        profile: characterProfile.value,
        exploredTopics: exploredTopics.value,
      });
      suggestedPrompts.value = response.prompts;
    } catch (err) {
      console.error('Failed to load suggested prompts:', err);
    }
  }, []);

  return {
    messages: conversationHistory.value,
    isGenerating: isGenerating.value,
    suggestedPrompts: suggestedPrompts.value,
    sendMessage,
    clearConversation,
    loadSuggestedPrompts,
  };
}
```

### Step 4: Update ConversationPrompts component (optional enhancement)

Update to use dynamic suggested prompts:

```typescript
// In ConversationPrompts.tsx, add:
import { suggestedPrompts } from '../../signals.js';

// In component, check for suggested prompts first:
const prompts = suggestedPrompts.value.length > 0
  ? suggestedPrompts.value.map(p => p.prompt)
  : DEFAULT_PROMPTS;
```

## Acceptance Criteria

- [x] `studioSessionId` signal added
- [x] `suggestedPrompts` signal added
- [x] `exploredTopics` signal added
- [x] `resetStudioSession()` function added
- [x] `studioConversation()` API function created
- [x] `suggestPrompts()` API function created
- [x] `useConversation` hook uses new API
- [x] Session ID persisted across messages
- [x] Inferred traits added to pending traits
- [x] Suggested prompts updated after each response
- [x] Error handling preserved
- [ ] No regression in existing chat functionality

## Validation Notes

- Regression testing was not executed; existing chat functionality is unverified beyond code inspection.
