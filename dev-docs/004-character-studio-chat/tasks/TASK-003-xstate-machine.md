# TASK-003: XState Machine for Studio NPC

**Priority**: P0 (Blocking)
**Phase**: 1 - Core Actor
**Estimate**: 45 minutes
**Depends On**: TASK-002

---

## Objective

Create an XState state machine to manage the studio NPC conversation flow, including states for responding, inferring traits, and handling advanced features.

## File to Create

`packages/actors/src/studio-npc/studio-machine.ts`

## State Machine Design

```text
States:
┌─────────┐    SEND_MESSAGE    ┌────────────┐
│  idle   │ ─────────────────> │ responding │
└─────────┘                    └────────────┘
     ^                               │
     │                               v
     │                        ┌────────────┐
     │                        │ inferring  │
     │                        └────────────┘
     │                               │
     │      RESPONSE_COMPLETE        v
     └─────────────────────── ┌────────────┐
                              │ suggesting │
                              └────────────┘
```

## Implementation

```typescript
// packages/actors/src/studio-npc/studio-machine.ts
import { createMachine, assign, fromPromise } from 'xstate';
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type {
  StudioMachineContext,
  StudioMachineEvent,
  ConversationMessage,
  InferredTrait,
  StudioResponse,
  DiscoveryTopic,
} from './types.js';
import { buildStudioSystemPrompt } from './prompts.js';

const MAX_HISTORY_MESSAGES = 20;

/**
 * Create the studio NPC state machine.
 */
export function createStudioMachine(initialContext: StudioMachineContext) {
  return createMachine(
    {
      id: 'studioNpc',
      initial: 'idle',
      context: initialContext,
      states: {
        idle: {
          on: {
            SEND_MESSAGE: {
              target: 'responding',
              actions: 'addUserMessage',
            },
            UPDATE_PROFILE: {
              actions: 'updateProfile',
            },
            CLEAR_CONVERSATION: {
              actions: 'clearConversation',
            },
            REQUEST_DILEMMA: { target: 'generatingDilemma' },
            REQUEST_EMOTIONAL_RANGE: { target: 'generatingEmotionalRange' },
            REQUEST_VIGNETTE: { target: 'generatingVignette' },
            REQUEST_MEMORY: { target: 'excavatingMemory' },
            REQUEST_FIRST_IMPRESSION: { target: 'generatingFirstImpression' },
            REQUEST_VOICE_FINGERPRINT: { target: 'analyzingVoice' },
          },
        },
        responding: {
          invoke: {
            src: 'generateResponse',
            input: ({ context }) => context,
            onDone: {
              target: 'inferring',
              actions: 'addCharacterMessage',
            },
            onError: {
              target: 'idle',
              actions: 'setError',
            },
          },
        },
        inferring: {
          invoke: {
            src: 'inferTraits',
            input: ({ context }) => context,
            onDone: {
              target: 'suggesting',
              actions: 'addInferredTraits',
            },
            onError: {
              target: 'suggesting',
            },
          },
        },
        suggesting: {
          invoke: {
            src: 'suggestPrompts',
            input: ({ context }) => context,
            onDone: {
              target: 'idle',
              actions: 'setPendingResponse',
            },
            onError: {
              target: 'idle',
              actions: 'setPendingResponseWithoutSuggestions',
            },
          },
        },
        generatingDilemma: {
          invoke: {
            src: 'generateDilemma',
            input: ({ context }) => context,
            onDone: { target: 'idle', actions: 'setDilemmaResponse' },
            onError: { target: 'idle', actions: 'setError' },
          },
        },
        generatingEmotionalRange: {
          invoke: {
            src: 'generateEmotionalRange',
            input: ({ context, event }) => ({ context, event }),
            onDone: { target: 'idle', actions: 'setEmotionalRangeResponse' },
            onError: { target: 'idle', actions: 'setError' },
          },
        },
        generatingVignette: {
          invoke: {
            src: 'generateVignette',
            input: ({ context, event }) => ({ context, event }),
            onDone: { target: 'idle', actions: 'setVignetteResponse' },
            onError: { target: 'idle', actions: 'setError' },
          },
        },
        excavatingMemory: {
          invoke: {
            src: 'excavateMemory',
            input: ({ context, event }) => ({ context, event }),
            onDone: { target: 'idle', actions: 'setMemoryResponse' },
            onError: { target: 'idle', actions: 'setError' },
          },
        },
        generatingFirstImpression: {
          invoke: {
            src: 'generateFirstImpression',
            input: ({ context, event }) => ({ context, event }),
            onDone: { target: 'idle', actions: 'setFirstImpressionResponse' },
            onError: { target: 'idle', actions: 'setError' },
          },
        },
        analyzingVoice: {
          invoke: {
            src: 'analyzeVoice',
            input: ({ context }) => context,
            onDone: { target: 'idle', actions: 'setVoiceFingerprint' },
            onError: { target: 'idle', actions: 'setError' },
          },
        },
      },
    },
    {
      actions: {
        addUserMessage: assign({
          conversation: ({ context, event }) => {
            if (event.type !== 'SEND_MESSAGE') return context.conversation;
            const newMessage: ConversationMessage = {
              id: crypto.randomUUID(),
              role: 'user',
              content: event.content,
              timestamp: new Date(),
            };
            return [...context.conversation, newMessage];
          },
        }),
        addCharacterMessage: assign({
          conversation: ({ context, event }) => {
            const output = event.output as { content: string; thought?: string };
            const newMessage: ConversationMessage = {
              id: crypto.randomUUID(),
              role: 'character',
              content: output.content,
              thought: output.thought,
              timestamp: new Date(),
            };
            return [...context.conversation, newMessage];
          },
        }),
        addInferredTraits: assign({
          inferredTraits: ({ context, event }) => {
            const newTraits = event.output as InferredTrait[];
            return [...context.inferredTraits, ...newTraits];
          },
        }),
        updateProfile: assign({
          profile: ({ context, event }) => {
            if (event.type !== 'UPDATE_PROFILE') return context.profile;
            return { ...context.profile, ...event.profile };
          },
        }),
        clearConversation: assign({
          conversation: () => [],
          summary: () => null,
          inferredTraits: () => [],
          exploredTopics: () => new Set<DiscoveryTopic>(),
        }),
        setError: assign({
          error: ({ event }) => {
            const e = event as { error?: { message?: string } };
            return e.error?.message ?? 'Unknown error';
          },
        }),
        setPendingResponse: assign({
          pendingResponse: ({ context, event }) => {
            const suggestions = event.output as { prompts: Array<{ prompt: string; topic: DiscoveryTopic; rationale: string }> };
            return {
              response: context.conversation[context.conversation.length - 1]?.content ?? '',
              thought: context.conversation[context.conversation.length - 1]?.thought,
              inferredTraits: context.inferredTraits.slice(-5),
              suggestedPrompts: suggestions.prompts,
              meta: {
                messageCount: context.conversation.length,
                summarized: context.summary !== null,
                exploredTopics: Array.from(context.exploredTopics),
              },
            } satisfies StudioResponse;
          },
        }),
        setPendingResponseWithoutSuggestions: assign({
          pendingResponse: ({ context }) => ({
            response: context.conversation[context.conversation.length - 1]?.content ?? '',
            thought: context.conversation[context.conversation.length - 1]?.thought,
            inferredTraits: context.inferredTraits.slice(-5),
            suggestedPrompts: [],
            meta: {
              messageCount: context.conversation.length,
              summarized: context.summary !== null,
              exploredTopics: Array.from(context.exploredTopics),
            },
          } satisfies StudioResponse),
        }),
        setDilemmaResponse: assign({ /* implement in TASK-009 */ }),
        setEmotionalRangeResponse: assign({ /* implement in TASK-010 */ }),
        setVignetteResponse: assign({ /* implement in TASK-011 */ }),
        setMemoryResponse: assign({ /* implement in TASK-012 */ }),
        setFirstImpressionResponse: assign({ /* implement in TASK-013 */ }),
        setVoiceFingerprint: assign({ /* implement in TASK-015 */ }),
      },
      actors: {
        generateResponse: fromPromise(async ({ input }) => {
          const ctx = input as StudioMachineContext;
          const systemPrompt = buildStudioSystemPrompt(ctx.profile, ctx.summary);

          const recentMessages = ctx.conversation
            .filter(m => m.role !== 'system')
            .slice(-MAX_HISTORY_MESSAGES);

          const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            ...recentMessages.map(m => ({
              role: m.role === 'character' ? 'assistant' as const : 'user' as const,
              content: m.content,
            })),
          ];

          const result = await Effect.runPromise(ctx.llmProvider.chat(messages));
          return { content: result.content ?? '' };
        }),
        inferTraits: fromPromise(async ({ input }) => {
          const ctx = input as StudioMachineContext;
          // Implement in TASK-007
          return [] as InferredTrait[];
        }),
        suggestPrompts: fromPromise(async ({ input }) => {
          const ctx = input as StudioMachineContext;
          // Implement in TASK-008
          return { prompts: [] };
        }),
        generateDilemma: fromPromise(async () => { /* TASK-009 */ return {}; }),
        generateEmotionalRange: fromPromise(async () => { /* TASK-010 */ return {}; }),
        generateVignette: fromPromise(async () => { /* TASK-011 */ return {}; }),
        excavateMemory: fromPromise(async () => { /* TASK-012 */ return {}; }),
        generateFirstImpression: fromPromise(async () => { /* TASK-013 */ return {}; }),
        analyzeVoice: fromPromise(async () => { /* TASK-015 */ return {}; }),
      },
    }
  );
}
```

## Export from index.ts

Update `packages/actors/src/studio-npc/index.ts`:

```typescript
export * from './types.js';
export { createStudioMachine } from './studio-machine.js';
```

## Acceptance Criteria

- [x] `studio-machine.ts` created with XState machine definition
- [x] States: idle, responding, inferring, suggesting, and advanced feature states
- [x] Actions: addUserMessage, addCharacterMessage, addInferredTraits, etc.
- [x] Actors: generateResponse invokes LLM with proper prompt
- [x] Machine exported from index.ts
- [ ] No TypeScript compilation errors
- [x] Placeholder actors for advanced features (to be implemented later)

## Validation Notes

- TypeScript compilation was not executed; compile status is unverified.
