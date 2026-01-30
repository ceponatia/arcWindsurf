import { z } from 'zod';

export const SystemEventTypeSchema = z.enum([
  'TICK',
  'SESSION_START',
  'SESSION_END',
  'ACTOR_SPAWN',
  'ACTOR_DESPAWN',
  'ACTION_REJECTED',
]);

export type SystemEventType = z.infer<typeof SystemEventTypeSchema>;

const baseSystemFields = {
  sessionId: z.string().optional(),
  timestamp: z.date(),
};

export const TickEventSchema = z.object({
  type: z.literal('TICK'),
  tick: z.number(),
  ...baseSystemFields,
});

export const SessionStartEventSchema = z.object({
  type: z.literal('SESSION_START'),
  ...baseSystemFields,
  sessionId: z.string(),
});

export const SystemEventSchema = z.discriminatedUnion('type', [
  TickEventSchema,
  SessionStartEventSchema,
  z.object({ type: z.literal('SESSION_END'), ...baseSystemFields, sessionId: z.string() }),
  z.object({
    type: z.literal('ACTOR_SPAWN'),
    actorId: z.string(),
    actorType: z.string(),
    locationId: z.string(),
    sessionId: z.string(),
    timestamp: z.date().optional(),
  }),
  z.object({
    type: z.literal('ACTOR_DESPAWN'),
    actorId: z.string(),
    sessionId: z.string(),
    timestamp: z.date().optional(),
  }),
  z.object({
    type: z.literal('ACTION_REJECTED'),
    originalEventType: z.string(),
    actorId: z.string(),
    reason: z.string(),
    suggestion: z.string().optional(),
    sessionId: z.string(),
    timestamp: z.date(),
  }),
]);

export type SystemEvent = z.infer<typeof SystemEventSchema>;
