import { z } from 'zod';

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

const baseIntentFields = {
  sessionId: z.string(),
  actorId: z.string().optional(),
  timestamp: z.date().optional(),
};

export const MoveIntentSchema = z.object({
  type: z.literal('MOVE_INTENT'),
  destinationId: z.string(),
  ...baseIntentFields,
});

export const SpeakIntentSchema = z.object({
  type: z.literal('SPEAK_INTENT'),
  content: z.string(),
  targetActorId: z.string().optional(),
  ...baseIntentFields,
});

export const IntentSchema = z.discriminatedUnion('type', [
  MoveIntentSchema,
  SpeakIntentSchema,
  z.object({
    type: z.literal('USE_ITEM_INTENT'),
    itemId: z.string(),
    ...baseIntentFields,
  }),
  z.object({
    type: z.literal('TAKE_ITEM_INTENT'),
    itemId: z.string(),
    ...baseIntentFields,
  }),
  z.object({
    type: z.literal('DROP_ITEM_INTENT'),
    itemId: z.string(),
    ...baseIntentFields,
  }),
  z.object({
    type: z.literal('ATTACK_INTENT'),
    targetActorId: z.string(),
    ...baseIntentFields,
  }),
  z.object({
    type: z.literal('WAIT_INTENT'),
    duration: z.number().optional(),
    ...baseIntentFields,
  }),
]);

export type Intent = z.infer<typeof IntentSchema>;
