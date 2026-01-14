# TASK-002: Studio NPC Types and Directory Structure

**Priority**: P0 (Blocking)
**Phase**: 1 - Core Actor
**Estimate**: 30 minutes
**Depends On**: None

---

## Objective

Create the `actors/studio-npc/` directory structure and define all TypeScript types needed for the studio NPC actor system.

## Directory to Create

```text
packages/actors/src/studio-npc/
├── index.ts
└── types.ts
```

## File 1: types.ts

Create `packages/actors/src/studio-npc/types.ts`:

```typescript
import type { CharacterProfile } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';

// ============================================================================
// Core Types
// ============================================================================

export interface StudioNpcActorConfig {
  sessionId: string;
  profile: Partial<CharacterProfile>;
  llmProvider: LLMProvider;
  onTraitInferred?: (trait: InferredTrait) => void;
  onProfileUpdate?: (updates: Partial<CharacterProfile>) => void;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'character' | 'system';
  content: string;
  timestamp: Date;
  thought?: string;
}

export interface InferredTrait {
  path: string;
  value: unknown;
  confidence: number;
  evidence: string;
  reasoning?: string;
  contradicts?: string;
  resolution?: 'newer' | 'stronger' | 'context-dependent' | 'flag-for-review';
}

// ============================================================================
// Discovery Types
// ============================================================================

export type DiscoveryTopic =
  | 'values'
  | 'fears'
  | 'relationships'
  | 'backstory'
  | 'stress-response'
  | 'social-behavior'
  | 'communication-style'
  | 'goals-motivations'
  | 'emotional-range';

export interface SuggestedPrompt {
  prompt: string;
  topic: DiscoveryTopic;
  rationale: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface StudioResponse {
  response: string;
  thought?: string;
  inferredTraits: InferredTrait[];
  suggestedPrompts: SuggestedPrompt[];
  meta: {
    messageCount: number;
    summarized: boolean;
    exploredTopics: DiscoveryTopic[];
  };
}

// ============================================================================
// Advanced Feature Types
// ============================================================================

export interface Dilemma {
  id: string;
  scenario: string;
  conflictingValues: string[];
  targetTraits: string[];
}

export interface ValueSignal {
  value: string;
  priority: number;
  evidence: string;
}

export type EmotionState = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'vulnerable';

export interface EmotionalRangeRequest {
  basePrompt: string;
  emotions: EmotionState[];
}

export interface EmotionalRangeResponse {
  variations: Array<{ emotion: EmotionState; response: string }>;
  inferredRange: { dimension: string; value: number };
}

export interface Contradiction {
  existingTrait: { path: string; value: unknown };
  newEvidence: { path: string; value: unknown };
  reflectionPrompt: string;
}

export type RelationshipArchetype =
  | 'authority-figure'
  | 'romantic-interest'
  | 'rival'
  | 'child'
  | 'stranger'
  | 'old-friend';

export type VignetteScenario = 'first-meeting' | 'conflict' | 'request-for-help' | 'casual';

export interface VignetteRequest {
  archetype: RelationshipArchetype;
  scenario: VignetteScenario;
}

export interface VignetteResponse {
  dialogue: string;
  inferredPatterns: {
    strangerDefault?: string;
    warmthRate?: string;
    conflictStyle?: string;
  };
}

export type MemoryTopic =
  | 'earliest-memory'
  | 'proudest-moment'
  | 'deepest-regret'
  | 'first-loss'
  | 'defining-choice';

export interface BackstoryElement {
  content: string;
  confidence: number;
  suggestedIntegration: string;
}

export interface FirstImpressionContext {
  context?: 'tavern' | 'court' | 'battlefield' | 'marketplace';
}

export interface FirstImpressionResponse {
  externalPerception: string;
  internalReaction: string;
  inferredGap: { presentedTrait: string; actualTrait: string } | null;
}

export interface InternalMonologueResponse {
  spoken: string;
  thought: string;
  inferredTraits: Array<{ path: string; evidence: 'spoken' | 'thought' | 'contrast' }>;
}

export interface VoiceFingerprint {
  vocabulary: {
    level: 'simple' | 'average' | 'educated' | 'erudite';
    distinctiveWords: string[];
  };
  rhythm: {
    averageSentenceLength: number;
    variability: 'consistent' | 'varied' | 'erratic';
  };
  patterns: {
    signaturePhrases: string[];
    avoidedTopics: string[];
    emotionalTriggers: string[];
  };
  humor: {
    frequency: 'none' | 'rare' | 'occasional' | 'frequent';
    type: string | null;
  };
}

// ============================================================================
// XState Machine Types
// ============================================================================

export interface StudioMachineContext {
  sessionId: string;
  profile: Partial<CharacterProfile>;
  llmProvider: LLMProvider;
  conversation: ConversationMessage[];
  summary: string | null;
  inferredTraits: InferredTrait[];
  exploredTopics: Set<DiscoveryTopic>;
  pendingResponse?: StudioResponse;
  error?: string;
}

export type StudioMachineEvent =
  | { type: 'SEND_MESSAGE'; content: string }
  | { type: 'REQUEST_DILEMMA' }
  | { type: 'REQUEST_EMOTIONAL_RANGE'; request: EmotionalRangeRequest }
  | { type: 'REQUEST_VIGNETTE'; request: VignetteRequest }
  | { type: 'REQUEST_MEMORY'; topic: MemoryTopic }
  | { type: 'REQUEST_FIRST_IMPRESSION'; context?: FirstImpressionContext }
  | { type: 'REQUEST_VOICE_FINGERPRINT' }
  | { type: 'UPDATE_PROFILE'; profile: Partial<CharacterProfile> }
  | { type: 'CLEAR_CONVERSATION' }
  | { type: 'RESPONSE_COMPLETE'; response: StudioResponse }
  | { type: 'ERROR'; error: string };
```

## File 2: index.ts

Create `packages/actors/src/studio-npc/index.ts`:

```typescript
// Types
export * from './types.js';

// Components (to be added in subsequent tasks)
// export { StudioNpcActor } from './studio-actor.js';
// export { createStudioMachine } from './studio-machine.js';
// export { ConversationManager } from './conversation.js';
// export { TraitInferenceEngine } from './inference.js';
// export { DiscoveryGuide } from './discovery.js';
```

## Step 3: Export from actors package

Update `packages/actors/src/index.ts` to include:

```typescript
// Studio NPC exports
export * from './studio-npc/index.js';
```

## Acceptance Criteria

- [x] Directory `packages/actors/src/studio-npc/` created
- [x] `types.ts` contains all type definitions listed above
- [x] `index.ts` exports all types
- [x] Types exported from main `@minimal-rpg/actors` package
- [ ] No TypeScript compilation errors
- [x] All types have JSDoc comments (add if missing)

## Validation Notes

- TypeScript compilation was not run during validation; compiler status is unconfirmed.
