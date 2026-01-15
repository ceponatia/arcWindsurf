// packages/actors/src/studio-npc/studio-machine.ts
import { createMachine, assign, fromPromise } from 'xstate';
import type { LLMMessage } from '@minimal-rpg/llm';
import { Effect } from 'effect';
import type {
  StudioMachineContext,
  StudioMachineEvent,
  ConversationMessage,
  InferredTrait,
  StudioResponse,
  DiscoveryTopic,
} from './types.js';
import { buildStudioSystemPrompt, buildDilemmaPrompt } from './prompts.js';
import { ConversationManager } from './conversation.js';
import { TraitInferenceEngine } from './inference.js';
import { DiscoveryGuide } from './discovery.js';
import { DilemmaEngine } from './dilemma.js';
import { EmotionalRangeGenerator } from './emotional-range.js';
import { VignetteGenerator } from './vignettes.js';
import { MemoryExcavator } from './memory-excavation.js';
import { FirstImpressionGenerator } from './first-impression.js';
import { VoiceFingerprintAnalyzer } from './voice-fingerprint.js';
import { validateCharacterResponse } from './validation.js';
import type {
  Dilemma,
  EmotionalRangeRequest,
  EmotionalRangeResponse,
  FirstImpressionContext,
  VignetteResponse,
  VignetteRequest,
  MemoryTopic,
  BackstoryElement,
  FirstImpressionResponse,
  VoiceFingerprint
} from './types.js';

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

function generateDilemmaFallback(): string {
  const index = Math.floor(Math.random() * DILEMMA_FALLBACKS.length);
  return DILEMMA_FALLBACKS[index] ?? "*pauses* This is... not a simple choice.";
}

function generateGenericFallback(): string {
  const index = Math.floor(Math.random() * GENERIC_FALLBACKS.length);
  return GENERIC_FALLBACKS[index] ?? "*hesitates* Let me gather my thoughts.";
}

/**
 * Create the studio NPC state machine.
 */
export function createStudioMachine(initialContext: StudioMachineContext) {
  return createMachine(
    {
      id: 'studioNpc',
      initial: 'idle',
      context: initialContext,
      types: {} as {
        context: StudioMachineContext;
        events: StudioMachineEvent;
      },
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
            RESTORE_STATE: {
              actions: 'restoreState',
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
            onDone: { target: 'responding', actions: 'setDilemmaResponse' },
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
          exploredTopics: ({ context, event }) => {
            if (event.type !== 'SEND_MESSAGE') return context.exploredTopics;
            const guide = new DiscoveryGuide({ profile: context.profile });
            const inferredTopic = guide.inferTopicFromMessage(event.content);
            if (inferredTopic) {
              const newSet = new Set(context.exploredTopics);
              newSet.add(inferredTopic);
              return newSet;
            }
            return context.exploredTopics;
          },
        }),
        addCharacterMessage: assign({
          conversation: ({ context, event }) => {
            const output = (event as unknown as { output: { content: string; thought?: string } }).output;
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
            const newTraits = (event as unknown as { output: InferredTrait[] }).output;
            return [...context.inferredTraits, ...newTraits];
          },
        }),
        restoreState: assign({
          conversation: ({ event }) => {
            if (event.type !== 'RESTORE_STATE') return [];
            return event.conversation;
          },
          summary: ({ event }) => {
            if (event.type !== 'RESTORE_STATE') return null;
            return event.summary;
          },
          inferredTraits: ({ event }) => {
            if (event.type !== 'RESTORE_STATE') return [];
            return event.inferredTraits;
          },
          exploredTopics: ({ event }) => {
            if (event.type !== 'RESTORE_STATE') return new Set<DiscoveryTopic>();
            return new Set(event.exploredTopics);
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
            const suggestions = (event as unknown as { output: { prompts: { prompt: string; topic: DiscoveryTopic; rationale: string }[] } }).output;
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
        setDilemmaResponse: assign({
          conversation: ({ context, event }) => {
            const dilemma = (event as unknown as { output: Dilemma }).output;

            console.log('[DilemmaDebug] Generated dilemma:', JSON.stringify(dilemma, null, 2));

            const newMessage: ConversationMessage = {
              id: crypto.randomUUID(),
              role: 'system',
              content: `[DILEMMA]: ${dilemma.scenario}`,
              timestamp: new Date(),
            };
            return [...context.conversation, newMessage];
          },
        }),
        setEmotionalRangeResponse: assign({
          pendingResponse: ({ context, event }) => {
            const output = (event as unknown as { output: EmotionalRangeResponse }).output;
            return {
              response: `[EMOTIONAL RANGE]: Generated ${output.variations.length} variations.`,
              inferredTraits: [],
              suggestedPrompts: [],
              meta: {
                messageCount: context.conversation.length,
                summarized: context.summary !== null,
                exploredTopics: Array.from(context.exploredTopics),
              },
            } satisfies StudioResponse;
          },
        }),
        setVignetteResponse: assign({
          conversation: ({ context, event }) => {
            const output = (event as unknown as { output: VignetteResponse }).output;
            const newMessage: ConversationMessage = {
              id: crypto.randomUUID(),
              role: 'system',
              content: `[VIGNETTE]: ${output.dialogue}`,
              timestamp: new Date(),
            };
            return [...context.conversation, newMessage];
          },
          pendingResponse: ({ context, event }) => {
            const output = (event as unknown as { output: VignetteResponse }).output;
            return {
              response: `[VIGNETTE]: ${output.dialogue}`,
              inferredTraits: [],
              suggestedPrompts: [],
              meta: {
                messageCount: context.conversation.length + 1,
                summarized: context.summary !== null,
                exploredTopics: Array.from(context.exploredTopics),
              },
            } satisfies StudioResponse;
          },
        }),
        setMemoryResponse: assign({
          conversation: ({ context, event }) => {
            const output = (event as unknown as { output: { memory: string } }).output;
            const newMessage: ConversationMessage = {
              id: crypto.randomUUID(),
              role: 'system',
              content: `[MEMORY]: ${output.memory}`,
              timestamp: new Date(),
            };
            return [...context.conversation, newMessage];
          },
          pendingResponse: ({ context, event }) => {
            const output = (event as unknown as { output: { memory: string; elements: BackstoryElement[] } }).output;
            return {
              response: `[MEMORY]: ${output.memory}`,
              inferredTraits: output.elements.map(e => ({
                path: 'backstory',
                value: e.content,
                confidence: e.confidence,
                evidence: 'memory excavation',
                reasoning: `Extracted from ${e.suggestedIntegration}`,
              })),
              suggestedPrompts: [],
              meta: {
                messageCount: context.conversation.length + 1,
                summarized: context.summary !== null,
                exploredTopics: Array.from(context.exploredTopics),
              },
            } satisfies StudioResponse;
          },
        }),
        setFirstImpressionResponse: assign({
          pendingResponse: ({ context, event }) => {
            const output = (event as unknown as { output: FirstImpressionResponse }).output;
            return {
              response: `[FIRST IMPRESSION]\nPerception: ${output.externalPerception}\nReality: ${output.internalReaction}`,
              inferredTraits: [],
              suggestedPrompts: [],
              meta: {
                messageCount: context.conversation.length,
                summarized: context.summary !== null,
                exploredTopics: Array.from(context.exploredTopics),
              },
            } satisfies StudioResponse;
          },
        }),
        setVoiceFingerprint: assign({
          pendingResponse: ({ context, event }) => {
            const output = (event as unknown as { output: VoiceFingerprint }).output;
            return {
              response: `[VOICE FINGERPRINT]: Level ${output.vocabulary.level}, rhythm ${output.rhythm.variability}.`,
              inferredTraits: [],
              suggestedPrompts: [],
              meta: {
                messageCount: context.conversation.length,
                summarized: context.summary !== null,
                exploredTopics: Array.from(context.exploredTopics),
              },
            } satisfies StudioResponse;
          },
        }),
      },
      actors: {
        generateResponse: fromPromise(async ({ input }) => {
          const ctx = input as StudioMachineContext;
          const actorStart = performance.now();

          const manager = new ConversationManager({
            llmProvider: ctx.llmProvider,
            characterName: ctx.profile.name,
          });
          manager.restore({ messages: ctx.conversation, summary: ctx.summary });

          // Check if summarization needed
          if (manager.needsSummarization()) {
            // Trigger summarization (handled separately in TASK-006/009)
            // For now we just log it as a signal
            console.log(`[StudioMachine] Summarization recommended for session ${ctx.sessionId}`);
          }

          const promptStart = performance.now();
          const systemPrompt = buildStudioSystemPrompt(ctx.profile, manager.getSummary());
          const contextWindow = manager.getContextWindow();

          const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
          ];

          // Special case: if last message is a dilemma, use buildDilemmaPrompt to help character live it
          const lastMsg = ctx.conversation[ctx.conversation.length - 1];
          const isDilemmaResponse = lastMsg?.role === 'system' && lastMsg.content.startsWith('[DILEMMA]');

          if (isDilemmaResponse) {
            const scenario = lastMsg.content.replace('[DILEMMA]: ', '');
            console.log('[DilemmaDebug] Dilemma scenario detected:', scenario);
            messages.push({
              role: 'system',
              content: buildDilemmaPrompt(scenario, ['your core values', 'the situation at hand'])
            });
          }

          messages.push(...contextWindow.map(m => ({
            role: (m.role === 'character' ? 'assistant' : 'user') as LLMMessage['role'],
            content: m.content,
          })));

          // Log full message array for debugging
          if (isDilemmaResponse) {
            console.log('[DilemmaDebug] Full messages array:', JSON.stringify(messages.map(m => ({
              role: m.role,
              contentLength: (m.content ?? '').length,
              contentPreview: (m.content ?? '').slice(0, 200) + ((m.content ?? '').length > 200 ? '...' : '')
            })), null, 2));
          }

          const promptMs = performance.now() - promptStart;
          const llmStart = performance.now();
          const result = await Effect.runPromise(ctx.llmProvider.chat(messages));
          const llmMs = performance.now() - llmStart;
          const responseContent = result.content ?? '';

          // Log timing for all requests
          const totalActorMs = performance.now() - actorStart;
          console.log(`[StudioTiming] generateResponse: total=${totalActorMs.toFixed(0)}ms prompt=${promptMs.toFixed(0)}ms llm=${llmMs.toFixed(0)}ms tokens=${messages.reduce((acc, m) => acc + (m.content ?? '').length, 0)} responseLen=${responseContent.length}`);

          // Log response for debugging
          if (isDilemmaResponse) {
            console.log('[DilemmaDebug] LLM response length:', responseContent.length);
            console.log('[DilemmaDebug] LLM response preview:', responseContent.slice(0, 500));
          }

          // Validate the response
          const validation = validateCharacterResponse(responseContent);

          if (!validation.valid) {
            console.error('[StudioMachine] Invalid LLM response detected:', validation);
            console.error('[StudioMachine] Response preview:', responseContent.slice(0, 500));

            // Return fallback message based on context
            const fallbackMessage = isDilemmaResponse
              ? generateDilemmaFallback()
              : generateGenericFallback();

            return {
              content: fallbackMessage,
              thought: undefined,
            };
          }

          return { content: responseContent, thought: undefined };
        }),
        inferTraits: fromPromise(async ({ input }) => {
          const ctx = input as StudioMachineContext;
          const engine = new TraitInferenceEngine({
            llmProvider: ctx.llmProvider,
            initialEvidence: ctx.inferredTraits,
          });

          // Get last character message
          const charMessages = [...ctx.conversation].reverse();
          const lastCharIndex = charMessages.findIndex(m => m.role === 'character');
          if (lastCharIndex === -1) return [];

          const lastChar = charMessages[lastCharIndex];
          const lastPrompt = charMessages[lastCharIndex + 1];

          if (!lastChar || !lastPrompt) return [];

          // If responding to a dilemma, use special analysis
          if (lastPrompt.role === 'system' && lastPrompt.content.startsWith('[DILEMMA]')) {
            const dilemmaEngine = new DilemmaEngine({ llmProvider: ctx.llmProvider });
            const scenario = lastPrompt.content.replace('[DILEMMA]: ', '');

            // Reconstruct dilemma object (we don't store the full object in conversation)
            const dilemma: Dilemma = {
              id: 'temp',
              scenario,
              conflictingValues: [], // DilemmaEngine.analyzeResponse uses this for prompt, but we might not have it anymore
              targetTraits: ['personalityMap.values']
            };

            const signals = await dilemmaEngine.analyzeResponse(dilemma, lastChar.content);

            // Map signals to InferredTraits
            return signals.map(s => ({
              path: `personalityMap.values`,
              value: { value: s.value, priority: s.priority },
              confidence: 0.8,
              evidence: s.evidence,
              reasoning: `Value signal detected from dilemma response: ${s.value} (priority ${s.priority})`,
              resolution: 'stronger' as const
            }));
          }

          // Default inference
          return await engine.inferFromExchange(
            lastPrompt.content,
            lastChar.content,
            ctx.profile
          );
        }),
        suggestPrompts: fromPromise(({ input }) => {
          const ctx = input as StudioMachineContext;
          const guide = new DiscoveryGuide({ profile: ctx.profile });

          // Sync explored topics
          for (const topic of ctx.exploredTopics) {
            guide.markExplored(topic);
          }

          const prompts = guide.generateMixedPrompts(3);
          return Promise.resolve({ prompts });
        }),
        generateDilemma: fromPromise(async ({ input }) => {
          const ctx = input as StudioMachineContext;
          const engine = new DilemmaEngine({ llmProvider: ctx.llmProvider });
          return await engine.generateDilemma(ctx.profile);
        }),
        generateEmotionalRange: fromPromise(async ({ input }) => {
          const { context, event } = input as { context: StudioMachineContext; event: StudioMachineEvent };
          if (event.type !== 'REQUEST_EMOTIONAL_RANGE') {
            return { variations: [], inferredRange: { dimension: 'expressiveness', value: 0 } };
          }
          const generator = new EmotionalRangeGenerator(context.llmProvider);
          const request: EmotionalRangeRequest = event.request;
          return await generator.generate(context.profile, request);
        }),
        generateVignette: fromPromise(async ({ input }) => {
          const { context, event } = input as { context: StudioMachineContext; event: StudioMachineEvent };
          if (event.type !== 'REQUEST_VIGNETTE') {
            return { dialogue: '', inferredPatterns: {} };
          }
          const generator = new VignetteGenerator(context.llmProvider);
          const request: VignetteRequest = event.request;
          return await generator.generate(context.profile, request);
        }),
        excavateMemory: fromPromise(async ({ input }) => {
          const { context, event } = input as { context: StudioMachineContext, event: { type: 'REQUEST_MEMORY', topic: MemoryTopic } };
          const excavator = new MemoryExcavator(context.llmProvider);
          return await excavator.excavate(context.profile, event.topic);
        }),
        generateFirstImpression: fromPromise(async ({ input }) => {
          const { context, event } = input as { context: StudioMachineContext; event: StudioMachineEvent };
          if (event.type !== 'REQUEST_FIRST_IMPRESSION') {
            return {
              externalPerception: '',
              internalReaction: '',
              inferredGap: null,
            } satisfies FirstImpressionResponse;
          }
          const generator = new FirstImpressionGenerator(context.llmProvider);
          const requestContext: FirstImpressionContext | undefined = event.context;
          return await generator.generate(context.profile, requestContext);
        }),
        analyzeVoice: fromPromise(async ({ input }) => {
          const context = input as StudioMachineContext;
          const analyzer = new VoiceFingerprintAnalyzer();
          return await Promise.resolve(analyzer.analyze(context.conversation));
        }),
      },
    }
  );
}
