import { z } from 'zod';

/**
 * Base event structure for all World Bus events.
 */
export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  sessionId: z.string(),
  source: z.string(), // Entity ID that generated the event
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

/**
 * Intents are emitted by agents but not yet resolved into state.
 */
export const IntentEventSchema = BaseEventSchema.extend({
  type: z.literal('INTENT'),
  intent: z.discriminatedUnion('action', [
    z.object({
      action: z.literal('MOVE'),
      params: z.object({ direction: z.string(), targetLocationId: z.string().optional() }),
    }),
    z.object({
      action: z.literal('TALK'),
      params: z.object({ targetId: z.string(), message: z.string() }),
    }),
    z.object({
      action: z.literal('EXAMINE'),
      params: z.object({ targetId: z.string() }),
    }),
    z.object({
      action: z.literal('USE_ITEM'),
      params: z.object({ itemId: z.string() }),
    }),
  ]),
});

export type IntentEvent = z.infer<typeof IntentEventSchema>;

/**
 * State changes are emitted by System Services after resolving intents.
 */
export const StateChangeEventSchema = BaseEventSchema.extend({
  type: z.literal('STATE_CHANGE'),
  change: z.object({
    path: z.string(),
    value: z.any(),
    previousValue: z.any().optional(),
  }),
});

export type StateChangeEvent = z.infer<typeof StateChangeEventSchema>;

/**
 * Sensory events are what agents "hear" or "see" from the bus.
 */
export const SensoryEventSchema = BaseEventSchema.extend({
  type: z.literal('SENSORY'),
  modality: z.enum(['visual', 'auditory', 'emotional', 'system']),
  payload: z.object({
    narrative: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export type SensoryEvent = z.infer<typeof SensoryEventSchema>;

/**
 * The WorldEvent is a union of all possible events on the bus.
 */
export const WorldEventSchema = z.discriminatedUnion('type', [
  IntentEventSchema,
  StateChangeEventSchema,
  SensoryEventSchema,
]);

export type WorldEvent = z.infer<typeof WorldEventSchema>;
