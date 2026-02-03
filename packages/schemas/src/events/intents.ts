import { z } from 'zod';
import { coercedDate } from '../utils/schema-helpers.js';

export const IntentTypeSchema = z.enum([
  'MOVE_INTENT',
  'SPEAK_INTENT',
  'USE_ITEM_INTENT',
  'TAKE_ITEM_INTENT',
  'DROP_ITEM_INTENT',
  'ATTACK_INTENT',
  'WAIT_INTENT',
]);

export type IntentType = z.infer<typeof IntentTypeSchema>;

const baseIntentFields = (timestampSchema: z.ZodType<Date>) => ({
  sessionId: z.string(),
  actorId: z.string().optional(),
  timestamp: timestampSchema.optional(),
});

const createMoveIntentSchema = (timestampSchema: z.ZodType<Date>) =>
  z.object({
    type: z.literal('MOVE_INTENT'),
    destinationId: z.string(),
    fromLocationId: z.string().optional(),
    toLocationId: z.string().optional(),
    reason: z.enum(['schedule', 'player', 'ai']).optional(),
    ...baseIntentFields(timestampSchema),
  });

const createSpeakIntentSchema = (timestampSchema: z.ZodType<Date>) =>
  z.object({
    type: z.literal('SPEAK_INTENT'),
    content: z.string(),
    targetActorId: z.string().optional(),
    ...baseIntentFields(timestampSchema),
  });

const createIntentSchema = (timestampSchema: z.ZodType<Date>) =>
  z.discriminatedUnion('type', [
    createMoveIntentSchema(timestampSchema),
    createSpeakIntentSchema(timestampSchema),
    z.object({
      type: z.literal('USE_ITEM_INTENT'),
      itemId: z.string(),
      ...baseIntentFields(timestampSchema),
    }),
    z.object({
      type: z.literal('TAKE_ITEM_INTENT'),
      itemId: z.string(),
      ...baseIntentFields(timestampSchema),
    }),
    z.object({
      type: z.literal('DROP_ITEM_INTENT'),
      itemId: z.string(),
      ...baseIntentFields(timestampSchema),
    }),
    z.object({
      type: z.literal('ATTACK_INTENT'),
      targetActorId: z.string(),
      ...baseIntentFields(timestampSchema),
    }),
    z.object({
      type: z.literal('WAIT_INTENT'),
      duration: z.number().optional(),
      ...baseIntentFields(timestampSchema),
    }),
  ]);

export const MoveIntentSchema = createMoveIntentSchema(z.date());

export const SpeakIntentSchema = createSpeakIntentSchema(z.date());

export const IntentSchema = createIntentSchema(z.date());

export const WireIntentSchema = createIntentSchema(coercedDate);

export type Intent = z.infer<typeof IntentSchema>;
