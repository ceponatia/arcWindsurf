# TASK-001: Create Studio Prompt Builders

**Priority**: P0
**Estimate**: 2 hours
**Blocks**: TASK-002, TASK-003
**Category**: Character Studio Prerequisites

---

## Objective

Create the prompt builder functions needed for Character Studio LLM integration.

## File to Create

`packages/api/src/routes/studio/prompts.ts`

## Functions to Implement

### 1. buildCharacterSystemPrompt

```typescript
export function buildCharacterSystemPrompt(profile: Partial<CharacterProfile>): string
```

Build a system prompt from character profile data including:

- Name and age
- Summary and backstory
- Personality dimensions (Big Five)
- Values, fears, social patterns
- Speech style and stress responses

### 2. buildTraitInferencePrompt

```typescript
export function buildTraitInferencePrompt(
  userMessage: string,
  characterResponse: string,
  currentProfile: Partial<CharacterProfile>
): string
```

Build a prompt for the LLM to analyze conversation and extract personality traits.

### 3. TRAIT_INFERENCE_SYSTEM_PROMPT

```typescript
export const TRAIT_INFERENCE_SYSTEM_PROMPT: string
```

System prompt instructing the LLM how to:

- Analyze conversations for personality traits
- Return structured JSON with trait paths, values, confidence scores
- Include valid trait paths (dimensions, social, values, fears, speech, stress)

## Acceptance Criteria

- [x] File exists at `packages/api/src/routes/studio/prompts.ts`
- [x] All three exports are implemented
- [x] TypeScript compiles without errors
- [x] Prompt output is well-formatted for LLM consumption
- [x] Trait inference returns parseable JSON schema

## Reference

See `PLAN-4.1-character-studio-1.0.md` Phase 2 sections 2.3 for prompt examples.
