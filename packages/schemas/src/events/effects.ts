import { z } from 'zod';

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

const baseEffectFields = {
  sessionId: z.string(),
  timestamp: z.date().optional(),
};

export const MovedEffectSchema = z.object({
  type: z.literal('MOVED'),
  actorId: z.string(),
  fromLocationId: z.string(),
  toLocationId: z.string(),
  ...baseEffectFields,
});

export const SpokeEffectSchema = z.object({
  type: z.literal('SPOKE'),
  actorId: z.string(),
  content: z.string(),
  targetActorId: z.string().optional(),
  ...baseEffectFields,
});

export const NpcActivityChangedEffectSchema = z.object({
  type: z.literal('NPC_ACTIVITY_CHANGED'),
  actorId: z.string(),
  previousActivity: z.string().optional(),
  newActivity: z.string(),
  ...baseEffectFields,
});

export const EffectSchema = z.discriminatedUnion('type', [
  MovedEffectSchema,
  SpokeEffectSchema,
  NpcActivityChangedEffectSchema,
  z.object({
    type: z.literal('OBJECT_EXAMINED'),
    actorId: z.string(),
    target: z.string(),
    focus: z.string().optional(),
    locationId: z.string().optional(),
    ...baseEffectFields,
  }),
  z.object({
    type: z.literal('DAMAGED'),
    actorId: z.string(),
    amount: z.number(),
    sourceId: z.string().optional(),
    ...baseEffectFields,
  }),
  z.object({
    type: z.literal('ITEM_ACQUIRED'),
    actorId: z.string(),
    itemId: z.string(),
    ...baseEffectFields,
  }),
  z.object({
    type: z.literal('ITEM_DROPPED'),
    actorId: z.string(),
    itemId: z.string(),
    ...baseEffectFields,
  }),
  z.object({
    type: z.literal('ITEM_USED'),
    actorId: z.string(),
    itemId: z.string(),
    ...baseEffectFields,
  }),
  z.object({
    type: z.literal('HEALED'),
    actorId: z.string(),
    amount: z.number(),
    ...baseEffectFields,
  }),
  z.object({
    type: z.literal('DIED'),
    actorId: z.string(),
    ...baseEffectFields,
  }),
]);

export type Effect = z.infer<typeof EffectSchema>;
