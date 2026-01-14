# PLAN-1.0: Dilemma Engine Troubleshooting & Improvement

**Priority**: P0 - Critical
**Status**: ✅ RESOLVED
**Created**: January 14, 2026
**Resolved**: January 14, 2026

---

## Executive Summary

During Playwright testing of the Character Studio, a critical bug was discovered where the Dilemma Engine returned completely unrelated content (FIFA 20 dataset documentation and Python/Jupyter code) instead of a character's response to a moral dilemma. This represents either training data leakage from the LLM, prompt injection, or severe context pollution.

### PM Notes

As this is a test environment using a secure API key to OpenRouter, I believe it is unlikely to be prompt injection or context pollution.

Tested twice myself. First time, moral dilemma test returned 204 for preflight and fetch stayed at "pending" for several minutes. Second test, I received the same Jupyter code response. I wonder if it's a code error on our end or if we're somehow triggering something in the LLM from our prompt. This is the only case I've seen DeepSeek respond like this.

---

## Resolution Summary

**Root Cause**: Hidden conversation history was being sent to the LLM from the database even though the UI showed a fresh conversation. On page reload, the frontend started fresh but the backend restored the old session, causing context pollution.

**Fixes Implemented**:

1. **TASK-001**: Added `[DilemmaDebug]` logging throughout dilemma flow
2. **TASK-002**: Added `validation.ts` with response validation (detects code markers, data leakage, special characters)
3. **TASK-003**: Added graceful fallback messages when validation fails
4. **TASK-001a**: Fresh session per page load - `resetStudioSession()` called on mount, old sessions preserved in DB with 24h TTL for debugging

**Files Modified**:

- `packages/actors/src/studio-npc/studio-machine.ts` - logging, validation, fallbacks
- `packages/actors/src/studio-npc/validation.ts` - new validation utilities
- `packages/actors/src/studio-npc/index.ts` - exports
- `packages/api/src/routes/studio.ts` - API logging
- `packages/web/src/features/character-studio/hooks/useCharacterStudio.ts` - session reset on mount

**Verification**: After rebuild, dilemma responses are now valid character dialogue.

---

## Bug Report

### Observed Behavior

When clicking "⚖️ Test Moral Dilemma" button:

1. Loading indicator appeared ("Kira Shadowmend is thinking...")
2. After ~60 seconds, response received
3. **Response was FIFA 20 Kaggle dataset documentation and Python code**
4. Corrupted response was saved to conversation history
5. React key collision warnings appeared in console

### Expected Behavior

Character should respond in-character to a moral dilemma scenario, expressing their values and making a choice that reflects their personality profile.

### Reproduction Steps

1. Create a new character with identity fields
2. Start a conversation (at least one exchange)
3. Click "⚖️ Test Moral Dilemma" button
4. Wait for response

---

## Root Cause Analysis

### Data Flow

```text
Frontend (ConversationPrompts.tsx)
  ↓ onClick={onDilemma}
useConversation.ts → generateDilemma()
  ↓ fetch('/studio/dilemma')
API (studio.ts) → actor.requestDilemma()
  ↓ sends REQUEST_DILEMMA event
StudioActor → requestAdvancedFeature()
  ↓
StudioMachine (generatingDilemma state)
  ↓ invoke: generateDilemma actor
DilemmaEngine.generateDilemma(profile)
  ↓ returns Dilemma (template-based, no LLM)
StudioMachine → setDilemmaResponse action
  ↓ adds [DILEMMA]: {scenario} to conversation
StudioMachine → transitions to 'responding' state
  ↓ invoke: generateResponse actor
generateResponse → builds messages array
  ↓ detects [DILEMMA] prefix, adds buildDilemmaPrompt
LLMProvider.chat(messages)  ← BUG OCCURS HERE
  ↓ returns corrupted content
Response saved to conversation
```

### Hypotheses

| # | Hypothesis | Likelihood | Investigation |
|---|------------|------------|---------------|
| 1 | **LLM provider returning cached/corrupted data** | HIGH | Check if same prompt produces consistent results |
| 2 | **Context window pollution** | MEDIUM | Check if conversation history contains problematic content |
| 3 | **Prompt too long/truncated** | MEDIUM | Log full message array before LLM call |
| 4 | **Model confusion from system prompt layering** | MEDIUM | Two system prompts (character + dilemma) may confuse model |
| 5 | **Missing response validation** | HIGH | No validation that response is relevant to prompt |
| 6 | **LLM API timeout/retry returning stale response** | LOW | Check for retry logic in LLM provider |

---

## Investigation Plan

### Phase 1: Logging & Diagnostics (30 min)

Add comprehensive logging to trace the exact state at failure point.

#### Task 1.1: Add request/response logging to generateResponse

```typescript
// In studio-machine.ts generateResponse actor
console.log('[DilemmaDebug] Messages sent to LLM:', JSON.stringify(messages, null, 2));
console.log('[DilemmaDebug] Response received:', result.content?.slice(0, 500));
```

#### Task 1.2: Log dilemma generation

```typescript
// In setDilemmaResponse action
console.log('[DilemmaDebug] Dilemma generated:', JSON.stringify(dilemma, null, 2));
```

#### Task 1.3: Add API-level logging

```typescript
// In studio.ts /studio/dilemma endpoint
console.log('[DilemmaDebug] Request body:', JSON.stringify(parsed.data, null, 2));
console.log('[DilemmaDebug] Response:', JSON.stringify(response, null, 2));
```

### Phase 2: LLM Provider Investigation (45 min)

#### Task 2.1: Verify LLM provider configuration

- Check which provider is configured (Ollama, OpenAI, Anthropic)
- Verify model name and parameters
- Check for any caching layers

#### Task 2.2: Create isolated LLM test

```typescript
// Test script to verify LLM works correctly in isolation
const testMessages: LLMMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Respond with exactly: "Hello World"' }
];
const result = await llmProvider.chat(testMessages);
console.log('LLM sanity check:', result.content);
```

#### Task 2.3: Test dilemma prompt in isolation

Send the exact dilemma prompt structure without conversation context to verify LLM responds appropriately.

### Phase 3: Prompt Engineering (1 hour)

#### Task 3.1: Review prompt construction

The current flow adds TWO system prompts:

1. Character embodiment prompt (`buildStudioSystemPrompt`)
2. Dilemma prompt (`buildDilemmaPrompt`)

This double-system-prompt pattern may confuse the model.

**Proposed Fix**: Merge dilemma instructions into a single coherent system prompt.

#### Task 3.2: Add response format guidance

Current dilemma prompt:

```text
You face a difficult choice:
{scenario}
This pits {values} against {values}.
Respond as yourself. Don't explain the dilemma - live it.
What do you do? What does it cost you?
```

**Proposed Enhancement**:

```text
[IMPORTANT: Respond in character. Your response should be 2-4 paragraphs describing your thoughts, feelings, and decision. Do not include any code, data, or technical content.]

You face a difficult choice:
{scenario}
...
```

#### Task 3.3: Add output guardrails

Add validation to detect obviously wrong responses:

```typescript
function isValidCharacterResponse(response: string): boolean {
  // Reject responses containing code markers
  if (response.includes('```') || response.includes('import ')) return false;
  // Reject responses with technical markers
  if (response.includes('<jupyter') || response.includes('def ')) return false;
  // Reject responses with obvious data leakage
  if (response.includes('kaggle') || response.includes('dataset')) return false;
  // Should be reasonable length
  if (response.length < 50 || response.length > 5000) return false;
  return true;
}
```

### Phase 4: Robust Error Handling (45 min)

#### Task 4.1: Add retry with validation

```typescript
async function generateResponseWithValidation(
  messages: LLMMessage[],
  maxRetries: number = 2
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await llmProvider.chat(messages);
    if (isValidCharacterResponse(result.content ?? '')) {
      return result.content!;
    }
    console.warn(`[DilemmaEngine] Invalid response on attempt ${attempt + 1}, retrying...`);
  }
  throw new Error('Failed to generate valid character response after retries');
}
```

#### Task 4.2: Add timeout handling

Current implementation has no timeout. Add a reasonable timeout (30s) with fallback:

```typescript
const result = await Promise.race([
  Effect.runPromise(ctx.llmProvider.chat(messages)),
  new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 30000))
]);
```

#### Task 4.3: Add user-friendly error messages

When dilemma fails, show a user-friendly message rather than corrupted content:

```typescript
if (!isValidCharacterResponse(response)) {
  return {
    content: "*pauses, lost in thought* ...I need a moment to consider this.",
    error: 'Character response was unclear, please try again.'
  };
}
```

---

## Testing Strategy

### Unit Tests

| Test | File | Description |
|------|------|-------------|
| `dilemma-validation.test.ts` | `packages/actors/test/studio-npc/` | Test `isValidCharacterResponse` function |
| `dilemma-generation.test.ts` | `packages/actors/test/studio-npc/` | Test dilemma template selection |
| `dilemma-prompt.test.ts` | `packages/actors/test/studio-npc/` | Test prompt construction |

### Integration Tests

| Test | Description |
|------|-------------|
| Full dilemma flow | Mock LLM, verify entire flow from button click to response |
| Invalid LLM response handling | Mock LLM to return garbage, verify graceful handling |
| Timeout handling | Mock slow LLM, verify timeout works |

### Manual E2E Tests

| Test | Steps | Expected |
|------|-------|----------|
| Happy path | Create character → Chat → Click Dilemma → Wait | Valid in-character response |
| Retry on failure | (Force invalid response) | Automatic retry, then fallback message |
| Conversation context | Long conversation → Dilemma | Character maintains context |

---

## Implementation Tasks

### Immediate (P0)

1. **TASK-001**: Add comprehensive logging to dilemma flow
2. **TASK-002**: Add response validation with `isValidCharacterResponse()`
3. **TASK-003**: Add fallback message on validation failure
4. **TASK-004**: Fix React key collision warnings

### Short-term (P1)

5. **TASK-005**: Review and refactor dual system prompt pattern
6. **TASK-006**: Add explicit "no code" instruction to prompts
7. **TASK-007**: Add request timeout (30s)
8. **TASK-008**: Write unit tests for validation logic

### Medium-term (P2)

9. **TASK-009**: Implement retry logic with exponential backoff
10. **TASK-010**: Add LLM response caching with validation
11. **TASK-011**: Create dilemma-specific LLM call with stricter parameters
12. **TASK-012**: Add telemetry for monitoring dilemma success rate

---

## Success Criteria

- [ ] Dilemma responses are always valid character dialogue
- [ ] Invalid responses are caught and handled gracefully
- [ ] User sees helpful message on failure, not garbage
- [ ] React key warnings eliminated
- [ ] Response time < 30 seconds with proper timeout
- [ ] 95%+ success rate for dilemma generation
- [ ] Full test coverage for dilemma flow

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/actors/src/studio-npc/studio-machine.ts` | Add logging, validation, timeout |
| `packages/actors/src/studio-npc/prompts.ts` | Enhance `buildDilemmaPrompt` |
| `packages/actors/src/studio-npc/dilemma.ts` | Add validation utilities |
| `packages/api/src/routes/studio.ts` | Add API-level logging and error handling |
| `packages/web/src/features/character-studio/components/conversation/` | Fix React key warnings |

---

## Appendix: Key Code Locations

### Dilemma Flow Entry Points

- **Frontend Button**: `packages/web/src/features/character-studio/components/conversation/ConversationPrompts.tsx:51-56`
- **Hook Handler**: `packages/web/src/features/character-studio/hooks/useConversation.ts:84-104`
- **Service Call**: `packages/web/src/features/character-studio/services/llm.ts:102-122`
- **API Endpoint**: `packages/api/src/routes/studio.ts:459-527`
- **Actor Method**: `packages/actors/src/studio-npc/studio-actor.ts:172-174`
- **State Machine**: `packages/actors/src/studio-npc/studio-machine.ts:110-117` (generatingDilemma state)
- **Dilemma Engine**: `packages/actors/src/studio-npc/dilemma.ts:104-145`
- **Prompt Builder**: `packages/actors/src/studio-npc/prompts.ts:260-269`

### LLM Response Generation

- **generateResponse actor**: `packages/actors/src/studio-npc/studio-machine.ts:366-406`
- **Dilemma detection**: `packages/actors/src/studio-npc/studio-machine.ts:389-397`
