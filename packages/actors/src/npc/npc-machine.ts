import { createMachine, assign, fromPromise } from 'xstate';
import type { WorldEvent, Intent } from '@minimal-rpg/schemas';
import type { NpcMachineContext, NpcMachineEvent } from './types.js';
import { PerceptionLayer } from './perception.js';
import { CognitionLayer } from './cognition.js';
import { worldBus } from '@minimal-rpg/bus';

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
      types: {} as {
        context: NpcMachineContext;
        events: NpcMachineEvent;
      },
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
            input: ({ context }: { context: NpcMachineContext }): NpcMachineContext => ({
              ...context,
            }),
            onDone: {
              target: 'acting',
              actions: assign({
                pendingIntent: ({ event }) => (event.output as WorldEvent | null) ?? undefined,
              }),
            },
            onError: {
              target: 'acting',
              actions: assign({ pendingIntent: () => undefined }),
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
            if (event.type === 'WORLD_EVENT') {
              return [...context.recentEvents, event.event].slice(-10);
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
            const isIntentEvent = (event: WorldEvent): event is Intent =>
              event.type.endsWith('_INTENT');

            if (isIntentEvent(context.pendingIntent)) {
              const enriched: Intent = {
                ...context.pendingIntent,
                sessionId: context.sessionId,
                actorId: context.actorId ?? context.npcId,
                timestamp: new Date(),
              };
              void worldBus.emit(enriched);
              return;
            }

            void worldBus.emit(context.pendingIntent);
          }
        },
        clearEvents: assign({
          recentEvents: () => [],
          perception: () => undefined,
          pendingIntent: () => undefined,
        }),
      },
      actors: {
        llmDecision: fromPromise(async ({ input }: { input: NpcMachineContext }) => {
          const context = input;
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

          const llmProvider = context.llmProvider;
          const profile = context.profile;

          if (llmProvider && profile) {
            const result = await CognitionLayer.decideLLM(cognitionContext, profile, llmProvider);
            return result?.intent ?? null;
          }

          const result = CognitionLayer.decideSync(cognitionContext);
          return result?.intent ?? null;
        }),
      },
    }
  );
};
