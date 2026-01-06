import { createMachine, assign } from 'xstate';
import type { WorldEvent } from '@minimal-rpg/schemas';
import type { NpcMachineContext } from './types.js';
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
          entry: 'think',
          always: {
            target: 'acting',
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
        think: assign({
          pendingIntent: ({ context }) => {
            if (!context.perception) return undefined;

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

            // For Phase 3, synchronous cognition
            // Phase 4 will add LLM calls via invoke
            const result = CognitionLayer.decideSync(cognitionContext);
            return result?.intent;
          },
        }),
        emitIntent: ({ context }) => {
          if (context.pendingIntent) {
            void worldBus.emit(context.pendingIntent);
          }
        },
        clearEvents: assign({
          recentEvents: () => [],
          perception: () => undefined,
          pendingIntent: () => undefined,
        }),
      },
    }
  );
};
