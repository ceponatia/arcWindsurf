# TASK-003: Add Fallback Message on Validation Failure

**Priority**: P0 - Immediate
**Estimate**: 25 minutes
**Depends On**: TASK-002

---

## Objective

When LLM response validation fails, provide a graceful in-character fallback message instead of showing corrupted content to the user.

## File to Modify

### `packages/actors/src/studio-npc/studio-machine.ts`

Update the `generateResponse` actor to validate and handle invalid responses:

```typescript
import { isValidCharacterResponse, validateCharacterResponse } from './validation.js';

// ... in actors section ...

generateResponse: fromPromise(async ({ input }) => {
  const ctx = input as StudioMachineContext;

  const manager = new ConversationManager({
    llmProvider: ctx.llmProvider,
    characterName: ctx.profile.name,
  });
  manager.restore({ messages: ctx.conversation, summary: ctx.summary });

  if (manager.needsSummarization()) {
    console.log(`[StudioMachine] Summarization recommended for session ${ctx.sessionId}`);
  }

  const systemPrompt = buildStudioSystemPrompt(ctx.profile, manager.getSummary());
  const contextWindow = manager.getContextWindow();

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Check if responding to a dilemma
  const lastMsg = ctx.conversation[ctx.conversation.length - 1];
  const isDilemmaResponse = lastMsg?.role === 'system' && lastMsg.content.startsWith('[DILEMMA]');

  if (isDilemmaResponse) {
    const scenario = lastMsg.content.replace('[DILEMMA]: ', '');
    messages.push({
      role: 'system',
      content: buildDilemmaPrompt(scenario, ['your core values', 'the situation at hand'])
    });
  }

  messages.push(...contextWindow.map(m => ({
    role: (m.role === 'character' ? 'assistant' : 'user') as LLMMessage['role'],
    content: m.content,
  })));

  const result = await Effect.runPromise(ctx.llmProvider.chat(messages));
  const responseContent = result.content ?? '';

  // Validate the response
  const validation = validateCharacterResponse(responseContent);

  if (!validation.valid) {
    console.error('[StudioMachine] Invalid LLM response detected:', validation);
    console.error('[StudioMachine] Response preview:', responseContent.slice(0, 500));

    // Return fallback message based on context
    const fallbackMessage = isDilemmaResponse
      ? generateDilemmaFallback(ctx.profile.name)
      : generateGenericFallback(ctx.profile.name);

    return {
      content: fallbackMessage,
      thought: undefined,
      _validationFailed: true,
      _validationReason: validation.reason,
    };
  }

  return { content: responseContent, thought: undefined };
}),
```

### Add fallback message generators

Add these helper functions to the same file or a separate `fallbacks.ts`:

```typescript
/**
 * Fallback messages when LLM response validation fails.
 */

const DILEMMA_FALLBACKS = [
  "*pauses, staring into the distance* This is... not a simple choice. I need a moment to think.",
  "*closes eyes, taking a deep breath* There's no easy answer here. Both paths have their costs.",
  "*runs a hand through their hair* I... I don't know. Part of me says one thing, part says another.",
  "*voice quiet* Some choices leave scars no matter which way you go.",
  "*looks away* If I knew the right answer, it wouldn't be a dilemma, would it?",
];

const GENERIC_FALLBACKS = [
  "*seems lost in thought for a moment* ...I'm sorry, where were we?",
  "*blinks, refocusing* Forgive me, my mind wandered. Could you ask that again?",
  "*hesitates* I... let me gather my thoughts.",
];

function generateDilemmaFallback(characterName?: string): string {
  const fallback = DILEMMA_FALLBACKS[Math.floor(Math.random() * DILEMMA_FALLBACKS.length)];
  return fallback;
}

function generateGenericFallback(characterName?: string): string {
  const fallback = GENERIC_FALLBACKS[Math.floor(Math.random() * GENERIC_FALLBACKS.length)];
  return fallback;
}
```

## Additional Improvements

### Track validation failures for monitoring

Add to context type in `types.ts`:

```typescript
interface StudioMachineContext {
  // ... existing fields ...

  /** Count of consecutive validation failures */
  validationFailureCount?: number;
}
```

Update action to track failures:

```typescript
addCharacterMessage: assign({
  conversation: ({ context, event }) => {
    const output = (event as unknown as { output: { content: string; thought?: string; _validationFailed?: boolean } }).output;
    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'character',
      content: output.content,
      thought: output.thought,
      timestamp: new Date(),
    };
    return [...context.conversation, newMessage];
  },
  validationFailureCount: ({ context, event }) => {
    const output = (event as unknown as { output: { _validationFailed?: boolean } }).output;
    if (output._validationFailed) {
      return (context.validationFailureCount ?? 0) + 1;
    }
    return 0; // Reset on success
  },
}),
```

## Acceptance Criteria

- [ ] Invalid LLM responses trigger fallback messages
- [ ] Fallback messages are in-character and contextual
- [ ] Dilemma-specific fallbacks acknowledge the difficulty of the choice
- [ ] Validation failures are logged with details
- [ ] User never sees code/data in the chat interface
- [ ] Consecutive failures are tracked

## Testing

1. Mock LLM to return Python code
2. Trigger dilemma → should see fallback message
3. Verify console shows validation failure logs
4. Verify fallback message appears in chat correctly
