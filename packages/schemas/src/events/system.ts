import { z } from 'zod';
import { coercedDate } from '../utils/schema-helpers.js';

export const SystemEventTypeSchema = z.enum([
  'TICK',
  'SESSION_START',
  'SESSION_END',
  'ACTOR_SPAWN',
  'ACTOR_DESPAWN',
  'ACTION_REJECTED',
]);

export type SystemEventType = z.infer<typeof SystemEventTypeSchema>;

const baseSystemFields = (timestampSchema: z.ZodType<Date>) => ({
  sessionId: z.string().optional(),
  timestamp: timestampSchema,
});

const createTickEventSchema = (timestampSchema: z.ZodType<Date>) =>
  z.object({
    type: z.literal('TICK'),
    tick: z.number(),
    ...baseSystemFields(timestampSchema),
  });

const createSessionStartEventSchema = (timestampSchema: z.ZodType<Date>) =>
  z.object({
    type: z.literal('SESSION_START'),
    ...baseSystemFields(timestampSchema),
    sessionId: z.string(),
  });

const createSystemEventSchema = (timestampSchema: z.ZodType<Date>) =>
  z.discriminatedUnion('type', [
    createTickEventSchema(timestampSchema),
    createSessionStartEventSchema(timestampSchema),
    z.object({ type: z.literal('SESSION_END'), ...baseSystemFields(timestampSchema), sessionId: z.string() }),
    z.object({
      type: z.literal('ACTOR_SPAWN'),
      actorId: z.string(),
      actorType: z.string(),
      locationId: z.string(),
      sessionId: z.string(),
      timestamp: timestampSchema.optional(),
    }),
    z.object({
      type: z.literal('ACTOR_DESPAWN'),
      actorId: z.string(),
      sessionId: z.string(),
      timestamp: timestampSchema.optional(),
    }),
    z.object({
      type: z.literal('ACTION_REJECTED'),
      originalEventType: z.string(),
      actorId: z.string(),
      reason: z.string(),
      suggestion: z.string().optional(),
      sessionId: z.string(),
      timestamp: timestampSchema,
    }),
  ]);

export const TickEventSchema = createTickEventSchema(z.date());

export const SessionStartEventSchema = createSessionStartEventSchema(z.date());

export const SystemEventSchema = createSystemEventSchema(z.date());

export const WireSystemEventSchema = createSystemEventSchema(coercedDate);

export type SystemEvent = z.infer<typeof SystemEventSchema>;
