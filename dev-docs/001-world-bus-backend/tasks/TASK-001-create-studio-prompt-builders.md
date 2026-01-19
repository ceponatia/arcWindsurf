# TASK-001: Create Studio Prompt Builders

**Priority**: P0
**Estimate**: 2 hours
**Blocks**: TASK-002, TASK-003
**Category**: Character Studio Prerequisites

---

## Objective

Create the prompt builder functions needed for Character Studio LLM integration.

## Where These Live Now

This task was implemented in `@minimal-rpg/actors` instead of `@minimal-rpg/api`.

- `packages/actors/src/studio-npc/prompts.ts` (system prompt: `buildStudioSystemPrompt`)
- `packages/actors/src/studio-npc/inference.ts` (trait inference: `TraitInferenceEngine` + its system prompt)

## Functions to Implement (Current)

### 1. buildStudioSystemPrompt

```typescript
export function buildStudioSystemPrompt(
  profile: Partial<CharacterProfile>,
  conversationSummary?: string | null
): string
```

Build a system prompt from character profile data including:

- Name and age
- Summary and backstory
- Personality dimensions (Big Five)
- Values, fears, social patterns
- Speech style and stress responses

### 2. TraitInferenceEngine

Trait inference is handled by `TraitInferenceEngine.inferFromExchange(...)`.

Build a prompt for the LLM to analyze conversation and extract personality traits.

### 3. Trait Inference System Prompt

Trait inference uses an internal system prompt to instruct the LLM how to:

- Analyze conversations for personality traits
- Return structured JSON with trait paths, values, confidence scores
- Include valid trait paths (dimensions, social, values, fears, speech, stress)

## Acceptance Criteria

- [x] System prompt builder exists in `packages/actors/src/studio-npc/prompts.ts`
- [x] Trait inference engine exists in `packages/actors/src/studio-npc/inference.ts`
- [x] TypeScript compiles without errors
- [x] Prompt output is well-formatted for LLM consumption
- [x] Trait inference returns parseable JSON schema

## Reference

See `PLAN-4.1-character-studio-1.0.md` Phase 2 sections 2.3 for prompt examples.
