import { createMachine, assign } from 'xstate';
import type { WorldEvent, CharacterProfile } from '@minimal-rpg/schemas';
import type { NpcMachineContext } from './types.js';
import { PerceptionLayer } from './perception.js';
import { CognitionLayer } from './cognition.js';
import { worldBus } from '@minimal-rpg/bus';
import type { LLMProvider } from '@minimal-rpg/llm';

/**
 * NPC state machine definition.
 *
 * States:
 * - idle: Waiting for events
 * - perceiving: Processing incoming events
 * - thinking: Deciding on actions
 * - acting: Emitting intents
 * - waiting: Cooldown period
 */
export const createNpcMachine = (initialContext: NpcMachineContext) => {
  return createMachine(
    {
      id: 'npc',
      initial: 'idle',
      context: initialContext,
      states: {
        idle: {
          on: {
            WORLD_EVENT: {
              actions: 'bufferEvent',
              target: 'perceiving',
            },
          },
        },
        perceiving: {
          entry: 'perceive',
          always: {
            target: 'thinking',
          },
        },
        thinking: {
          invoke: {
            src: 'llmDecision',
            onDone: {
              target: 'acting',
              actions: assign({ pendingIntent: (_, event) => (event.data as WorldEvent | null) ?? undefined }),
            },
            onError: {
              target: 'acting',
              actions: assign({ pendingIntent: (_, event) => (event.data as WorldEvent | null) ?? undefined }),
            },
          },
        },
        acting: {
          entry: 'emitIntent',
          always: {
            target: 'waiting',
          },
        },
        waiting: {
          after: {
            500: 'idle', // 500ms cooldown
          },
          entry: 'clearEvents',
        },
      },
    },
    {
      actions: {
        bufferEvent: assign({
          recentEvents: ({ context, event }) => {
            const e = event as { type: string; event?: WorldEvent };
            if (e.type === 'WORLD_EVENT' && e.event) {
              return [...context.recentEvents, e.event].slice(-10);
            }
            return context.recentEvents;
          },
        }),
        perceive: assign({
          perception: ({ context }) => {
            return PerceptionLayer.buildContext(context.recentEvents, {
              id: context.actorId,
              type: 'npc',
              npcId: context.npcId,
              sessionId: context.sessionId,
              locationId: context.locationId,
              spawnedAt: new Date(),
              lastActiveAt: new Date(),
              recentEvents: context.recentEvents,
              goals: [],
            });
          },
        }),
        think: () => undefined,
        emitIntent: ({ context }) => {
          if (context.pendingIntent) {
            const enriched = {
              sessionId: context.sessionId,
              actorId: context.actorId ?? context.npcId,
              timestamp: new Date(),
              ...context.pendingIntent,
            };
            void worldBus.emit(enriched as WorldEvent);
          }
        },
        clearEvents: assign({
          recentEvents: () => [],
          perception: () => undefined,
          pendingIntent: () => undefined,
        }),
      },
      services: {
        llmDecision: ({ context }) => async () => {
          if (!context.perception) return null;

          const cognitionContext = {
            perception: context.perception,
            state: {
              id: context.actorId,
              type: 'npc' as const,
              npcId: context.npcId,
              sessionId: context.sessionId,
              locationId: context.locationId,
              spawnedAt: new Date(),
              lastActiveAt: new Date(),
              recentEvents: context.recentEvents,
              goals: [],
            },
            availableActions: ['SPEAK_INTENT', 'MOVE_INTENT'],
          };

          const llmProvider = context.llmProvider as LLMProvider | undefined;
          const profile = context.profile as CharacterProfile | undefined;

          if (llmProvider && profile) {
            const result = await CognitionLayer.decideLLM(cognitionContext, profile, llmProvider);
            return result?.intent ?? null;
          }

          const result = CognitionLayer.decideSync(cognitionContext);
          return result?.intent ?? null;
        },
      },
    }
  );
};
