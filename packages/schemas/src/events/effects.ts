import { z } from 'zod';
import { coercedDate } from '../utils/schema-helpers.js';

export const EffectTypeSchema = z.enum([
  'MOVED',
  'SPOKE',
  'DAMAGED',
  'ITEM_ACQUIRED',
  'ITEM_DROPPED',
  'ITEM_USED',
  'HEALED',
  'DIED',
  'NPC_ACTIVITY_CHANGED',
  'OBJECT_EXAMINED',
]);

export type EffectType = z.infer<typeof EffectTypeSchema>;

const baseEffectFields = (timestampSchema: z.ZodType<Date>) => ({
  sessionId: z.string(),
  timestamp: timestampSchema.optional(),
});

const createMovedEffectSchema = (timestampSchema: z.ZodType<Date>) =>
  z.object({
    type: z.literal('MOVED'),
    actorId: z.string(),
    fromLocationId: z.string(),
    toLocationId: z.string(),
    ...baseEffectFields(timestampSchema),
  });

const createSpokeEffectSchema = (timestampSchema: z.ZodType<Date>) =>
  z.object({
    type: z.literal('SPOKE'),
    actorId: z.string(),
    content: z.string(),
    targetActorId: z.string().optional(),
    ...baseEffectFields(timestampSchema),
  });

const createNpcActivityChangedEffectSchema = (timestampSchema: z.ZodType<Date>) =>
  z.object({
    type: z.literal('NPC_ACTIVITY_CHANGED'),
    actorId: z.string(),
    previousActivity: z.string().optional(),
    newActivity: z.string(),
    ...baseEffectFields(timestampSchema),
  });

const createEffectSchema = (timestampSchema: z.ZodType<Date>) =>
  z.discriminatedUnion('type', [
    createMovedEffectSchema(timestampSchema),
    createSpokeEffectSchema(timestampSchema),
    createNpcActivityChangedEffectSchema(timestampSchema),
    z.object({
      type: z.literal('OBJECT_EXAMINED'),
      actorId: z.string(),
      target: z.string(),
      focus: z.string().optional(),
      locationId: z.string().optional(),
      ...baseEffectFields(timestampSchema),
    }),
    z.object({
      type: z.literal('DAMAGED'),
      actorId: z.string(),
      amount: z.number(),
      sourceId: z.string().optional(),
      ...baseEffectFields(timestampSchema),
    }),
    z.object({
      type: z.literal('ITEM_ACQUIRED'),
      actorId: z.string(),
      itemId: z.string(),
      ...baseEffectFields(timestampSchema),
    }),
    z.object({
      type: z.literal('ITEM_DROPPED'),
      actorId: z.string(),
      itemId: z.string(),
      ...baseEffectFields(timestampSchema),
    }),
    z.object({
      type: z.literal('ITEM_USED'),
      actorId: z.string(),
      itemId: z.string(),
      ...baseEffectFields(timestampSchema),
    }),
    z.object({
      type: z.literal('HEALED'),
      actorId: z.string(),
      amount: z.number(),
      ...baseEffectFields(timestampSchema),
    }),
    z.object({
      type: z.literal('DIED'),
      actorId: z.string(),
      ...baseEffectFields(timestampSchema),
    }),
  ]);

export const MovedEffectSchema = createMovedEffectSchema(z.date());

export const SpokeEffectSchema = createSpokeEffectSchema(z.date());

export const NpcActivityChangedEffectSchema = createNpcActivityChangedEffectSchema(z.date());

export const EffectSchema = createEffectSchema(z.date());

export const WireEffectSchema = createEffectSchema(coercedDate);

export type Effect = z.infer<typeof EffectSchema>;
