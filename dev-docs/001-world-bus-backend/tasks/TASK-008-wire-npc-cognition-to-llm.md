# TASK-008: Wire NPC Actor Cognition to LLM

**Priority**: P2
**Estimate**: 4-6 hours
**Depends On**: TASK-002 (LLM integration pattern established)
**Category**: World Bus Phase 4 - Actor Intelligence

---

## Objective

Replace the rule-based `CognitionLayer.decideSync()` with LLM-powered decision making for NPC actors.

## Files to Modify

- `packages/actors/src/npc/cognition.ts`
- `packages/actors/src/npc/npc-machine.ts`

## Current State

`packages/actors/src/npc/cognition.ts`:

```typescript
// Lines 7-8:
// This is a simplified version for Phase 3.
// Phase 4 will integrate LLM providers for rich decision-making.
```

Currently uses hardcoded rules:

- If someone spoke → respond with SPEAK_INTENT
- If someone moved into location → acknowledge arrival

## Implementation Steps

### 1. Create NPC Cognition Prompts

New file: `packages/actors/src/npc/prompts.ts`

```typescript
export function buildNpcCognitionPrompt(
  perception: PerceptionContext,
  state: NpcActorState,
  profile: CharacterProfile // NPC's personality profile
): string;

export const NPC_DECISION_SYSTEM_PROMPT: string;
```

### 2. Update CognitionLayer

```typescript
export class CognitionLayer {
  // Keep decideSync for fallback/testing
  static decideSync(context: CognitionContext): ActionResult | null;

  // New async method with LLM
  static async decideLLM(
    context: CognitionContext,
    profile: CharacterProfile,
    llmProvider: LLMProvider
  ): Promise<ActionResult | null>;
}
```

### 3. Update NPC State Machine

Use XState's `invoke` for async LLM calls:

```typescript
// In npc-machine.ts
states: {
  thinking: {
    invoke: {
      src: 'llmDecision',
      onDone: {
        target: 'acting',
        actions: assign({ pendingIntent: (_, event) => event.data?.intent }),
      },
      onError: {
        target: 'idle', // Fallback on LLM failure
      },
    },
  },
}
```

### 4. Inject LLM Provider

NPC actors need access to LLM provider:

```typescript
// Option A: Pass via ActorConfig
interface NpcActorConfig extends ActorConfig {
  llmProvider?: LLMProvider;
  profile: CharacterProfile;
}

// Option B: Use singleton/service locator
import { getLLMProvider } from '@minimal-rpg/llm';
```

## Acceptance Criteria

- [ ] CognitionLayer has async `decideLLM()` method
- [ ] NPC prompts file created with decision prompts
- [ ] NPC state machine uses invoke for async cognition
- [ ] LLM provider injected into NPC actors
- [ ] NPC profile (personality) used in decision making
- [ ] Fallback to rule-based if LLM fails
- [ ] Existing tests still pass (rule-based path)
- [ ] Response time acceptable (<2s for decision)

## Notes

- Consider using tiered cognition (fast model for simple decisions)
- May want to batch/debounce decisions to reduce API calls
- Token budget should be enforced per decision
