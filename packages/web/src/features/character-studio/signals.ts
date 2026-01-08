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
