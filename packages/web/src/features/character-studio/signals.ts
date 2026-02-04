import { signal, computed } from '@preact/signals-react';
import {
  resolveSensoryProfile,
  type CharacterProfile,
  type PersonalityMap,
  type ResolvedBodyMap,
  type SensoryProfileConfig,
} from '@minimal-rpg/schemas';
import { generateLocalId } from '@minimal-rpg/utils';
import type { StudioFieldErrors, StudioFieldKey } from './validation/types.js';
import { applyTrait } from './utils/trait-applicator.js';
import { validateCharacterProfileBeforeSave } from './validation/validateCharacterProfileBeforeSave.js';

// ============================================================================
// Character Data Signals
// ============================================================================

/** Current character profile being created/edited */
export const characterProfile = signal<Partial<CharacterProfile>>({});

const DEFAULT_SENSORY_PROFILE_CONFIG: SensoryProfileConfig = {
  autoDefaults: { enabled: true },
};

/** Sensory profile configuration for defaults and templates */
export const sensoryProfileConfig = signal<SensoryProfileConfig>(DEFAULT_SENSORY_PROFILE_CONFIG);

/** Character ID (null for new characters) */
export const characterId = signal<string | null>(null);

/** Main studio loading state */
export const isStudioLoading = signal<boolean>(false);

/** Dirty flag - unsaved changes exist */
export const isDirty = signal<boolean>(false);

/** Save status */
export const saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

/** Field-level validation errors (used for save-time warnings) */
export const fieldErrors = signal<StudioFieldErrors>({});

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
  id: string; // Unique identifier for React keys
  path: string; // e.g., 'personalityMap.social.strangerDefault'
  value: unknown; // e.g., 'guarded'
  confidence: number; // 0-1
  evidence: string; // Quote from conversation that triggered inference
  status: 'pending' | 'accepted' | 'rejected' | 'dismissed';
}

/** Conversation history with the character */
export const conversationHistory = signal<ConversationMessage[]>([]);

/** Current conversation summary */
export const conversationSummary = signal<string | null>(null);

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

/** Pending trait inferences from conversation */
export const pendingTraits = signal<InferredTrait[]>([]);

/** Is the character currently "thinking" (LLM generating) */
export const isGenerating = signal<boolean>(false);

/** Whether to perform trait inference on conversation exchanges */
export const traitInferenceEnabled = signal<boolean>(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('studio.traitInference') !== 'false'
    : true
);

// ============================================================================
// UI State Signals
// ============================================================================

export type StudioPanel = 'conversation' | 'identity' | 'traits' | 'preview';

/** Currently active panel */
export const activePanel = signal<StudioPanel>('conversation');

/** Expanded identity cards */
export const expandedCards = signal<Set<string>>(new Set(['core']));

/** Is a deletion operation in progress */
export const isDeleting = signal<boolean>(false);

// ============================================================================
// Computed Signals
// ============================================================================

/**
 * Resolved sensory body map computed from profile + sensory config.
 */
export const resolvedBodyMap = computed<ResolvedBodyMap>(() => {
  const profile = characterProfile.value;
  const config = sensoryProfileConfig.value;
  return resolveSensoryProfile(profile, config);
});

export const REQUIRED_FIELDS = ['name', 'age', 'gender', 'summary', 'backstory', 'race'] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

/**
 * Detailed completion status for each major section
 */
export const sectionCompletion = computed(() => {
  const p = characterProfile.value;
  const pm = p.personalityMap;
  const sensoryConfig = sensoryProfileConfig.value;

  return {
    name: !!p.name?.trim(),
    backstory: !!p.backstory?.trim(),
    dimensions: !!(pm?.dimensions && Object.keys(pm.dimensions).length > 0),
    values: !!(pm?.values && pm.values.length > 0),
    fears: !!(pm?.fears && pm.fears.length > 0),
    social: !!(pm?.social && Object.keys(pm.social).length > 0),
    speech: !!(pm?.speech && Object.keys(pm.speech).length > 0),
    stress: !!(pm?.stress && Object.keys(pm.stress).length > 0),
    physique: !!(
      p.physique &&
      (typeof p.physique === 'string'
        ? p.physique.trim().length > 0
        : Object.keys(p.physique).length > 0)
    ),
    body: !!(p.body && Object.keys(p.body).length > 0),
    sensoryProfile: {
      complete: true,
      hasContent: Boolean(
        (sensoryConfig.templateBlend?.templates.length ?? 0) > 0
          ? true
          : p.body && Object.keys(p.body).length > 0
      ),
    },
  };
});

/** Completion status for required fields only */
export const requiredFieldsCompletion = computed(() => {
  const p = characterProfile.value;

  return {
    name: !!p.name?.trim(),
    age: typeof p.age === 'number' && p.age > 0,
    gender: !!p.gender && (p.gender as string) !== '',
    summary: !!p.summary?.trim(),
    backstory: !!p.backstory?.trim(),
    race: !!p.race && (p.race as string) !== '',
  };
});

/** Completion percentage (0-100) based on required fields only */
export const completionScore = computed(() => {
  const completion = requiredFieldsCompletion.value;
  const items = Object.values(completion);
  const completedCount = items.filter(Boolean).length;

  return Math.round((completedCount / REQUIRED_FIELDS.length) * 100);
});

/** All accepted traits from conversation */
export const acceptedTraits = computed(() =>
  pendingTraits.value.filter((t) => t.status === 'accepted')
);

// ============================================================================
// Actions
// ============================================================================

export function updateProfile<K extends keyof CharacterProfile>(
  key: K,
  value: CharacterProfile[K]
): void {
  characterProfile.value = { ...characterProfile.value, [key]: value };
  if (key === 'sensoryProfile') {
    const next = (value as SensoryProfileConfig | undefined) ?? DEFAULT_SENSORY_PROFILE_CONFIG;
    sensoryProfileConfig.value = next;
  }
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

/**
 * Update sensory profile config and persist to character profile.
 */
export function updateSensoryProfileConfig(updates: Partial<SensoryProfileConfig>): void {
  sensoryProfileConfig.value = {
    ...sensoryProfileConfig.value,
    ...updates,
  };
  updateProfile('sensoryProfile', sensoryProfileConfig.value);
}

/**
 * Validates the current character profile.
 * Updates fieldErrors signal and returns true if valid.
 */
export function validateProfile(): boolean {
  const errors = validateCharacterProfileBeforeSave(characterProfile.value);
  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

/**
 * Replace all field errors at once.
 */
export function setFieldErrors(next: StudioFieldErrors): void {
  fieldErrors.value = next;
}

/**
 * Clear a single field error.
 */
export function clearFieldError(key: StudioFieldKey): void {
  const current = fieldErrors.value;
  if (!Object.prototype.hasOwnProperty.call(current, key)) return;
  const { [key]: removed, ...rest } = current;
  void removed;
  fieldErrors.value = rest;
}

/**
 * Clear all field errors.
 */
export function clearAllFieldErrors(): void {
  fieldErrors.value = {};
}

export function addMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): void {
  const newMessage: ConversationMessage = {
    ...message,
    id: generateLocalId('msg'),
    timestamp: new Date(),
  };
  conversationHistory.value = [...conversationHistory.value, newMessage];
}

export function setTraitInferenceEnabled(enabled: boolean): void {
  traitInferenceEnabled.value = enabled;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('studio.traitInference', String(enabled));
  }
}

export function acceptTrait(traitId: string): void {
  const trait = pendingTraits.value.find((t) => t.path === traitId);
  if (!trait) return;

  // Apply the trait value to the profile
  applyTrait(trait, {
    profile: characterProfile.value,
    updateProfile,
    updatePersonalityMap,
  });

  // Update trait status to 'accepted'
  pendingTraits.value = pendingTraits.value.map((t) =>
    t.path === traitId ? { ...t, status: 'accepted' as const } : t
  );
}

export function rejectTrait(traitId: string): void {
  pendingTraits.value = pendingTraits.value.map((t) =>
    t.path === traitId ? { ...t, status: 'rejected' } : t
  );
}

export function resetStudio(): void {
  characterProfile.value = {};
  sensoryProfileConfig.value = DEFAULT_SENSORY_PROFILE_CONFIG;
  characterId.value = null;
  isDirty.value = false;
  saveStatus.value = 'idle';
  fieldErrors.value = {};
  conversationHistory.value = [];
  conversationSummary.value = null;
  pendingTraits.value = [];
  isGenerating.value = false;
  activePanel.value = 'conversation';
  expandedCards.value = new Set(['core']);
  studioSessionId.value = null;
  suggestedPrompts.value = [];
  exploredTopics.value = [];
  isDeleting.value = false;
}

/** Reset session state (call when starting new character) */
export function resetStudioSession(): void {
  studioSessionId.value = null;
  suggestedPrompts.value = [];
  exploredTopics.value = [];
  conversationHistory.value = [];
  conversationSummary.value = null;
  pendingTraits.value = [];
}
