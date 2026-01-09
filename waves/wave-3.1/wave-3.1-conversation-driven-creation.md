# Wave 3.1: Conversation-Driven Character Creation

**Status**: Planning
**Parent**: [VIS-3.1-character-builder-refactor.md](../vision/v2-refactor/VIS-3.1-character-builder-refactor.md)
**Created**: January 2026

---

## Overview

This document provides implementation details for the **Conversation-Driven Creation** feature described in section 4.3.1 of the vision document. Users will create characters by having a conversation with them, with the system inferring personality traits from the dialogue.

---

## Phase 0: Legacy Cleanup & Scaffold

### 0.1 Files Safe to Delete

These files contain no extractable code and can be removed immediately:

| File | Reason | Lines |
|------|--------|-------|
| `features/character-builder/CharacterBuilder.tsx` | Main component, replaced entirely | 400 |
| `features/character-builder/hooks/useCharacterBuilderForm.ts` | Form state → signals | 133 |
| `features/character-builder/hooks/index.ts` | Re-exports hook | 2 |
| `features/character-builder/api.ts` | Simple wrapper, inline elsewhere | 19 |
| `features/character-builder/components/PreviewSidebar.tsx` | Static preview | 191 |
| `features/character-builder/components/BodyMapSelector.tsx` | Basic picker | 55 |
| `features/character-builder/README.md` | Documentation | ~60 |
| `features/character-builder/index.ts` | Barrel export | 2 |
| `features/character-builder/assets/*` | Static images | N/A |

**Total removable**: ~860 lines + assets

### 0.2 Files to Keep (Code Extraction Required)

These files have reusable code that must be preserved:

| File | Keep | Move To |
|------|------|---------|
| `types.ts` | Type definitions, factory functions | `@minimal-rpg/schemas/character/form-types.ts` |
| `transformers.ts` | `buildPersonalityMap`, `personalityMapToFormState`, `buildProfile`, `mapProfileToForm` | Keep in new feature |
| `utils.ts` | `clamp` → `@minimal-rpg/utils`, rest stays | Split |
| `components/personality/*` | All 9 files | Move to `character-studio/components/personality/` |
| `components/common.tsx` | `Subsection`, `SelectInput` | Move to `shared/components/` |
| `components/RadarChart.tsx` | Big Five visualization | Move to `character-studio/components/` |
| `components/region-hierarchy.ts` | Label mappings | Keep in new feature |

### 0.3 Scaffold New Feature Directory

```bash
mkdir -p packages/web/src/features/character-studio/{components,hooks,services}
mkdir -p packages/web/src/features/character-studio/components/{conversation,personality,traits}
```

### 0.4 Rewire App Routes

**File**: `packages/web/src/layouts/AppShell.tsx`

```typescript
// BEFORE (line 17-20):
const CharacterBuilder = React.lazy(async () => {
  const mod = await import('../features/character-builder/index.js');
  return { default: mod.CharacterBuilder };
});

// AFTER:
const CharacterStudio = React.lazy(async () => {
  const mod = await import('../features/character-studio/index.js');
  return { default: mod.CharacterStudio };
});
```

**File**: `packages/web/src/layouts/hooks/useAppController.ts`

Update all `navigateToCharacterBuilder` references to `navigateToCharacterStudio`.

**File**: `packages/web/src/types.ts`

```typescript
// Update ViewMode type
export type ViewMode =
  | 'home'
  | 'character-studio'  // was 'character-builder'
  | 'character-library'
  // ... rest unchanged
```

### 0.5 Delete Commands

```bash
# After code extraction is complete:
rm -rf packages/web/src/features/character-builder/CharacterBuilder.tsx
rm -rf packages/web/src/features/character-builder/hooks/
rm -rf packages/web/src/features/character-builder/api.ts
rm -rf packages/web/src/features/character-builder/components/PreviewSidebar.tsx
rm -rf packages/web/src/features/character-builder/components/BodyMapSelector.tsx
rm -rf packages/web/src/features/character-builder/assets/
rm -rf packages/web/src/features/character-builder/README.md
rm -rf packages/web/src/features/character-builder/index.ts
```

---

## Phase 1: Core Infrastructure

### 1.1 Signal Store

**File**: `packages/web/src/features/character-studio/signals.ts`

```typescript
import { signal, computed } from '@preact/signals-react';
import type { CharacterProfile, PersonalityMap } from '@minimal-rpg/schemas';

// ============================================================================
// Character Data Signals
// ============================================================================

/** Current character profile being created/edited */
export const characterProfile = signal<Partial<CharacterProfile>>({});

/** Character ID (null for new characters) */
export const characterId = signal<string | null>(null);

/** Dirty flag - unsaved changes exist */
export const isDirty = signal<boolean>(false);

/** Save status */
export const saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

// ============================================================================
// Conversation Signals
// ============================================================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'character' | 'system';
  content: string;
  timestamp: Date;
  inferredTraits?: InferredTrait[];
}

export interface InferredTrait {
  path: string;           // e.g., 'personalityMap.social.strangerDefault'
  value: unknown;         // e.g., 'guarded'
  confidence: number;     // 0-1
  source: string;         // Quote from conversation that triggered inference
  status: 'pending' | 'accepted' | 'rejected';
}

/** Conversation history with the character */
export const conversationHistory = signal<ConversationMessage[]>([]);

/** Pending trait inferences from conversation */
export const pendingTraits = signal<InferredTrait[]>([]);

/** Is the character currently "thinking" (LLM generating) */
export const isGenerating = signal<boolean>(false);

// ============================================================================
// UI State Signals
// ============================================================================

export type StudioPanel = 'conversation' | 'identity' | 'traits' | 'preview';

/** Currently active panel */
export const activePanel = signal<StudioPanel>('conversation');

/** Expanded identity cards */
export const expandedCards = signal<Set<string>>(new Set(['core']));

// ============================================================================
// Computed Signals
// ============================================================================

/** Completion percentage (0-100) */
export const completionScore = computed(() => {
  const p = characterProfile.value;
  let score = 0;

  if (p.name?.trim()) score += 15;
  if (p.age) score += 5;
  if (p.summary?.trim()) score += 15;
  if (p.backstory?.trim()) score += 10;
  if (p.personalityMap?.dimensions && Object.keys(p.personalityMap.dimensions).length > 0) score += 20;
  if (p.personalityMap?.values && p.personalityMap.values.length > 0) score += 15;
  if (p.personalityMap?.fears && p.personalityMap.fears.length > 0) score += 10;
  if (p.personalityMap?.speech) score += 5;
  if (p.body && Object.keys(p.body).length > 0) score += 5;

  return Math.min(100, score);
});

/** All accepted traits from conversation */
export const acceptedTraits = computed(() =>
  pendingTraits.value.filter(t => t.status === 'accepted')
);

// ============================================================================
// Actions
// ============================================================================

export function updateProfile<K extends keyof CharacterProfile>(
  key: K,
  value: CharacterProfile[K]
): void {
  characterProfile.value = { ...characterProfile.value, [key]: value };
  isDirty.value = true;
}

export function updatePersonalityMap(updates: Partial<PersonalityMap>): void {
  const current = characterProfile.value.personalityMap ?? {};
  characterProfile.value = {
    ...characterProfile.value,
    personalityMap: { ...current, ...updates },
  };
  isDirty.value = true;
}

export function addMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): void {
  const newMessage: ConversationMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  };
  conversationHistory.value = [...conversationHistory.value, newMessage];
}

export function acceptTrait(traitId: string): void {
  pendingTraits.value = pendingTraits.value.map(t =>
    t.path === traitId ? { ...t, status: 'accepted' } : t
  );
  // TODO: Apply trait to characterProfile
}

export function rejectTrait(traitId: string): void {
  pendingTraits.value = pendingTraits.value.map(t =>
    t.path === traitId ? { ...t, status: 'rejected' } : t
  );
}

export function resetStudio(): void {
  characterProfile.value = {};
  characterId.value = null;
  isDirty.value = false;
  saveStatus.value = 'idle';
  conversationHistory.value = [];
  pendingTraits.value = [];
  isGenerating.value = false;
  activePanel.value = 'conversation';
  expandedCards.value = new Set(['core']);
}
```

### 1.2 Types (Reuse Existing)

**Reuse from `@minimal-rpg/schemas`:**

- `CharacterProfile` - Main profile type
- `PersonalityMap` - Structured personality
- `CharacterBasics` - Name, age, summary, backstory
- `BodyMap` - Body region data
- `PersonalityDimension`, `CoreEmotion`, `AttachmentStyle`, etc.

**Reuse from `@minimal-rpg/schemas/events`:**

- `WorldEvent` - For sandbox actor events
- `Intent` types - For actor intents

**Reuse from `packages/actors/src/npc/types.ts`:**

- `NpcActorState` - Actor state for sandbox
- `PerceptionContext` - What the NPC perceives
- `CognitionContext` - Decision inputs
- `ActionResult` - Intent to emit

**New types** (add to signals.ts above):

- `ConversationMessage`
- `InferredTrait`
- `StudioPanel`

### 1.3 Hooks

**File**: `packages/web/src/features/character-studio/hooks/useCharacterStudio.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  characterProfile,
  characterId,
  isDirty,
  saveStatus,
  resetStudio,
  updateProfile,
} from '../signals.js';
import { loadCharacter, persistCharacter } from '../services/api.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';

export interface UseCharacterStudioOptions {
  id?: string | null;
  onSave?: () => void;
}

export interface UseCharacterStudioResult {
  profile: Partial<CharacterProfile>;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isEditing: boolean;
  save: () => Promise<void>;
  reset: () => void;
  updateField: <K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) => void;
}

export function useCharacterStudio(options: UseCharacterStudioOptions = {}): UseCharacterStudioResult {
  useSignals();

  const { id, onSave } = options;

  // Load character on mount if editing
  useEffect(() => {
    if (id) {
      characterId.value = id;
      loadCharacter(id).then(profile => {
        characterProfile.value = profile;
        isDirty.value = false;
      }).catch(err => {
        console.error('Failed to load character:', err);
      });
    } else {
      resetStudio();
    }

    return () => {
      // Cleanup on unmount
    };
  }, [id]);

  const save = useCallback(async () => {
    saveStatus.value = 'saving';
    try {
      const profile = characterProfile.value as CharacterProfile;
      await persistCharacter(profile);
      saveStatus.value = 'saved';
      isDirty.value = false;
      onSave?.();
    } catch {
      saveStatus.value = 'error';
    }
  }, [onSave]);

  const reset = useCallback(() => {
    resetStudio();
  }, []);

  return {
    profile: characterProfile.value,
    isDirty: isDirty.value,
    saveStatus: saveStatus.value,
    isEditing: Boolean(id),
    save,
    reset,
    updateField: updateProfile,
  };
}
```

**File**: `packages/web/src/features/character-studio/hooks/useConversation.ts`

```typescript
import { useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import {
  conversationHistory,
  isGenerating,
  pendingTraits,
  characterProfile,
  addMessage,
  type InferredTrait,
} from '../signals.js';
import { generateCharacterResponse, inferTraitsFromMessage } from '../services/llm.js';

export interface UseConversationResult {
  messages: typeof conversationHistory.value;
  isGenerating: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => void;
}

export function useConversation(): UseConversationResult {
  useSignals();

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    addMessage({ role: 'user', content });

    isGenerating.value = true;

    try {
      // Generate character response
      const profile = characterProfile.value;
      const history = conversationHistory.value;

      const response = await generateCharacterResponse({
        profile,
        history,
        userMessage: content,
      });

      // Add character response
      addMessage({ role: 'character', content: response.content });

      // Infer traits from the exchange
      const inferred = await inferTraitsFromMessage({
        userMessage: content,
        characterResponse: response.content,
        currentProfile: profile,
      });

      if (inferred.length > 0) {
        pendingTraits.value = [
          ...pendingTraits.value,
          ...inferred.map(t => ({ ...t, status: 'pending' as const })),
        ];
      }
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
  }, []);

  return {
    messages: conversationHistory.value,
    isGenerating: isGenerating.value,
    sendMessage,
    clearConversation,
  };
}
```

**File**: `packages/web/src/features/character-studio/hooks/index.ts`

```typescript
export * from './useCharacterStudio.js';
export * from './useConversation.js';
```

---

## Phase 2: Services Layer

### 2.1 API Service

**File**: `packages/web/src/features/character-studio/services/api.ts`

```typescript
import type { CharacterProfile } from '@minimal-rpg/schemas';
import {
  getCharacter,
  saveCharacter,
  deleteCharacter as apiDeleteCharacter,
} from '../../../shared/api/client.js';

// Re-export from shared API client (reuse existing functions)
export const loadCharacter = getCharacter;
export const persistCharacter = saveCharacter;
export const removeCharacter = apiDeleteCharacter;

// Generate a unique ID for new characters
export function generateCharacterId(): string {
  return crypto.randomUUID();
}
```

### 2.2 LLM Service

**File**: `packages/web/src/features/character-studio/services/llm.ts`

```typescript
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
```

### 2.3 Trait Inference (Client-Side Fallback)

**File**: `packages/web/src/features/character-studio/services/trait-inference.ts`

```typescript
import type { InferredTrait, ConversationMessage } from '../signals.js';
import type { CharacterProfile } from '@minimal-rpg/schemas';

/**
 * Simple client-side trait inference based on keyword matching.
 * This is a fallback when the API is unavailable.
 */
export function inferTraitsFromKeywords(
  message: string,
  _currentProfile: Partial<CharacterProfile>
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
        path: 'personalityMap.fears',
        value: { category, specific: extractFearSpecific(message) },
        confidence: 0.6,
        source: message.slice(0, 100),
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
        path: 'personalityMap.values',
        value: { value, priority: 5 },
        confidence: 0.5,
        source: message.slice(0, 100),
      });
    }
  }

  // Social pattern detection
  if (/stranger|don't know|new people/i.test(lower)) {
    const isGuarded = /careful|cautious|wary|suspicious/i.test(lower);
    const isFriendly = /open|friendly|welcoming/i.test(lower);

    if (isGuarded) {
      traits.push({
        path: 'personalityMap.social.strangerDefault',
        value: 'guarded',
        confidence: 0.7,
        source: message.slice(0, 100),
      });
    } else if (isFriendly) {
      traits.push({
        path: 'personalityMap.social.strangerDefault',
        value: 'open',
        confidence: 0.7,
        source: message.slice(0, 100),
      });
    }
  }

  return traits;
}

function extractFearSpecific(message: string): string {
  // Simple extraction - take the phrase after "afraid of" or "fear of"
  const match = message.match(/(?:afraid of|fear of|scared of)\s+([^.!?,]+)/i);
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
        themes[word] = (themes[word] ?? 0) + 1;
      }
    }
  }

  return Object.entries(themes)
    .filter(([_, count]) => count > 2)
    .map(([theme, frequency]) => ({ theme, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}
```

---

## Phase 3: UI Components

### 3.1 Main Container

**File**: `packages/web/src/features/character-studio/CharacterStudio.tsx`

```typescript
import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { useCharacterStudio } from './hooks/useCharacterStudio.js';
import { activePanel, completionScore } from './signals.js';
import { ConversationPane } from './components/conversation/ConversationPane.js';
import { TraitSuggestions } from './components/traits/TraitSuggestions.js';
import { IdentityPanel } from './components/IdentityPanel.js';
import { StudioHeader } from './components/StudioHeader.js';

export interface CharacterStudioProps {
  id?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
}

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  id,
  onSave,
  onCancel,
}) => {
  useSignals();

  const { profile, isDirty, saveStatus, save, isEditing } = useCharacterStudio({
    id,
    onSave,
  });

  const panel = activePanel.value;
  const completion = completionScore.value;

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <StudioHeader
        characterName={profile.name ?? 'New Character'}
        completion={completion}
        isDirty={isDirty}
        saveStatus={saveStatus}
        onSave={save}
        onCancel={onCancel}
        isEditing={isEditing}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversation Pane */}
        <div className="w-1/2 border-r border-slate-800 flex flex-col">
          <ConversationPane />
        </div>

        {/* Right: Identity & Traits */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Trait Suggestions (top) */}
          <TraitSuggestions />

          {/* Identity Cards (scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <IdentityPanel />
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3.2 Conversation Pane

**File**: `packages/web/src/features/character-studio/components/conversation/ConversationPane.tsx`

```typescript
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { useConversation } from '../../hooks/useConversation.js';
import { characterProfile } from '../../signals.js';
import { MessageBubble } from './MessageBubble.js';
import { ConversationPrompts } from './ConversationPrompts.js';

export const ConversationPane: React.FC = () => {
  useSignals();

  const { messages, isGenerating, sendMessage } = useConversation();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const characterName = characterProfile.value.name ?? 'Character';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, isGenerating, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handlePromptSelect = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-sm font-medium text-slate-200">
          Conversation with {characterName}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Chat to discover their personality. Traits will be inferred automatically.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {messages.length === 0 && (
          <ConversationPrompts onSelect={handlePromptSelect} />
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} characterName={characterName} />
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="animate-pulse">●</div>
            <span>{characterName} is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${characterName} something...`}
            className="flex-1 min-h-[44px] max-h-32 resize-none bg-slate-900 text-slate-200 rounded-lg px-4 py-3 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
            disabled={isGenerating}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
```

**File**: `packages/web/src/features/character-studio/components/conversation/MessageBubble.tsx`

```typescript
import React from 'react';
import type { ConversationMessage } from '../../signals.js';

export interface MessageBubbleProps {
  message: ConversationMessage;
  characterName: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  characterName,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="text-center text-xs text-slate-500 py-2">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'bg-slate-800 text-slate-200 rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <div className="text-xs text-slate-400 mb-1 font-medium">
            {characterName}
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
};
```

**File**: `packages/web/src/features/character-studio/components/conversation/ConversationPrompts.tsx`

```typescript
import React from 'react';

export interface ConversationPromptsProps {
  onSelect: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  "Tell me about yourself",
  "What's your biggest fear?",
  "What do you value most in life?",
  "How do you handle stress?",
  "What makes you angry?",
  "Tell me about your family",
  "What are your goals?",
  "How do you act around strangers?",
];

export const ConversationPrompts: React.FC<ConversationPromptsProps> = ({
  onSelect,
}) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400 text-center">
        Start a conversation to discover your character's personality
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          >
            "{prompt}"
          </button>
        ))}
      </div>
    </div>
  );
};
```

### 3.3 Trait Suggestions

**File**: `packages/web/src/features/character-studio/components/traits/TraitSuggestions.tsx`

```typescript
import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { pendingTraits, acceptTrait, rejectTrait } from '../../signals.js';

export const TraitSuggestions: React.FC = () => {
  useSignals();

  const pending = pendingTraits.value.filter(t => t.status === 'pending');

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-800 bg-slate-900/30 p-4">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
        Detected Traits
      </h4>

      <div className="space-y-2">
        {pending.map((trait) => (
          <div
            key={trait.path}
            className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-200 font-medium">
                {formatTraitPath(trait.path)}
              </div>
              <div className="text-xs text-slate-400 truncate">
                "{trait.source}"
              </div>
              <div className="text-xs text-violet-400 mt-1">
                Confidence: {Math.round(trait.confidence * 100)}%
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => acceptTrait(trait.path)}
                className="px-3 py-1.5 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => rejectTrait(trait.path)}
                className="px-3 py-1.5 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatTraitPath(path: string): string {
  const parts = path.split('.');
  const last = parts[parts.length - 1];
  return last
    ?.replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim() ?? path;
}
```

### 3.4 Additional Components (Stubs)

**File**: `packages/web/src/features/character-studio/components/StudioHeader.tsx`

```typescript
import React from 'react';

export interface StudioHeaderProps {
  characterName: string;
  completion: number;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSave: () => void;
  onCancel?: () => void;
  isEditing: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  characterName,
  completion,
  isDirty,
  saveStatus,
  onSave,
  onCancel,
  isEditing,
}) => {
  return (
    <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">
          {isEditing ? `Editing: ${characterName}` : 'Create Character'}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-xs text-slate-500">
            {completion}% complete
          </div>
          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isDirty && (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Character'}
        </button>
      </div>
    </header>
  );
};
```

**File**: `packages/web/src/features/character-studio/components/IdentityPanel.tsx`

```typescript
import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, expandedCards, updateProfile } from '../signals.js';

export const IdentityPanel: React.FC = () => {
  useSignals();

  const profile = characterProfile.value;
  const expanded = expandedCards.value;

  const toggleCard = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    expandedCards.value = next;
  };

  return (
    <div className="space-y-4">
      {/* Core Identity Card */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleCard('core')}
          className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <span className="font-medium text-slate-200">Core Identity</span>
          <span className="text-xs text-slate-500">
            {expanded.has('core') ? '▼' : '▶'}
          </span>
        </button>

        {expanded.has('core') && (
          <div className="p-4 space-y-4 bg-slate-900/30">
            <label className="block">
              <span className="text-xs text-slate-400">Name</span>
              <input
                type="text"
                value={profile.name ?? ''}
                onChange={(e) => updateProfile('name', e.target.value)}
                className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                placeholder="Character name"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-slate-400">Age</span>
                <input
                  type="number"
                  value={profile.age ?? ''}
                  onChange={(e) => updateProfile('age', parseInt(e.target.value, 10))}
                  className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                  placeholder="Age"
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-400">Gender</span>
                <select
                  value={(profile as Record<string, unknown>).gender as string ?? ''}
                  onChange={(e) => updateProfile('gender' as keyof typeof profile, e.target.value)}
                  className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-slate-400">Summary</span>
              <textarea
                value={profile.summary ?? ''}
                onChange={(e) => updateProfile('summary', e.target.value)}
                className="mt-1 w-full min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
                placeholder="A brief description of who they are..."
              />
            </label>
          </div>
        )}
      </div>

      {/* Additional cards can be added here */}
      <div className="text-xs text-slate-500 text-center py-4">
        More identity cards coming soon...
      </div>
    </div>
  );
};
```

### 3.5 Barrel Export

**File**: `packages/web/src/features/character-studio/index.ts`

```typescript
export { CharacterStudio } from './CharacterStudio.js';
export * from './signals.js';
export * from './hooks/index.js';
```

---

## Phase 4: API Endpoints (Backend)

### 4.1 New Endpoints Required

These endpoints need to be added to `packages/api/src/routes/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/studio/generate` | POST | Generate character response |
| `/studio/infer-traits` | POST | Infer traits from conversation |

**File**: `packages/api/src/routes/studio.ts` (new file)

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../types.js';

const generateSchema = z.object({
  profile: z.record(z.unknown()),
  history: z.array(z.object({
    role: z.enum(['user', 'character', 'system']),
    content: z.string(),
  })),
  userMessage: z.string().min(1),
});

const inferSchema = z.object({
  userMessage: z.string(),
  characterResponse: z.string(),
  currentProfile: z.record(z.unknown()),
});

export const studioRoutes = new Hono<Env>()
  .post('/generate', zValidator('json', generateSchema), async (c) => {
    const { profile, history, userMessage } = c.req.valid('json');

    // TODO: Integrate with LLM provider
    // For now, return a placeholder response
    const response = `[Character response to: "${userMessage.slice(0, 50)}..."]`;

    return c.json({ content: response });
  })
  .post('/infer-traits', zValidator('json', inferSchema), async (c) => {
    const { userMessage, characterResponse, currentProfile } = c.req.valid('json');

    // TODO: Use LLM to infer traits
    // For now, return empty array
    return c.json({ traits: [] });
  });
```

---

## Phase 5: Testing & Polish

### 5.1 Test Plan

| Test | Type | Description |
|------|------|-------------|
| Signal reactivity | Unit | Verify signal updates trigger re-renders |
| Conversation flow | Integration | Send message → receive response → infer traits |
| Trait acceptance | Integration | Accept trait → profile updated |
| Save/Load | E2E | Create character → save → reload → verify |
| Route navigation | E2E | Navigate to studio → create → save → library shows character |

### 5.2 Files to Create

```text
packages/web/src/features/character-studio/
├── CharacterStudio.tsx
├── index.ts
├── signals.ts
├── components/
│   ├── StudioHeader.tsx
│   ├── IdentityPanel.tsx
│   ├── conversation/
│   │   ├── ConversationPane.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ConversationPrompts.tsx
│   │   └── index.ts
│   └── traits/
│       ├── TraitSuggestions.tsx
│       └── index.ts
├── hooks/
│   ├── useCharacterStudio.ts
│   ├── useConversation.ts
│   └── index.ts
└── services/
    ├── api.ts
    ├── llm.ts
    └── trait-inference.ts
```

---

## Summary

### Reused Assets

| Asset | Source | Usage |
|-------|--------|-------|
| `CharacterProfile` | `@minimal-rpg/schemas` | Main data type |
| `PersonalityMap` | `@minimal-rpg/schemas` | Personality structure |
| `getCharacter`, `saveCharacter` | `shared/api/client.ts` | API calls |
| `getAccessToken` | `shared/auth/accessToken.ts` | Auth |
| `@preact/signals-react` | Already installed | State management |
| Personality form types | `character-builder/types.ts` | Move to schemas |
| Transformers | `character-builder/transformers.ts` | Keep in new feature |

### New Implementation

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `signals.ts` | ~150 | Signal store |
| `CharacterStudio.tsx` | ~60 | Main container |
| `ConversationPane.tsx` | ~100 | Chat UI |
| `MessageBubble.tsx` | ~40 | Message display |
| `ConversationPrompts.tsx` | ~40 | Starter prompts |
| `TraitSuggestions.tsx` | ~80 | Trait acceptance UI |
| `StudioHeader.tsx` | ~60 | Header with save |
| `IdentityPanel.tsx` | ~100 | Identity cards |
| `useCharacterStudio.ts` | ~60 | Main hook |
| `useConversation.ts` | ~80 | Chat hook |
| `services/api.ts` | ~20 | API wrapper |
| `services/llm.ts` | ~80 | LLM integration |
| `services/trait-inference.ts` | ~100 | Client-side fallback |

**Total new code**: ~970 lines
**Total deleted code**: ~860 lines
