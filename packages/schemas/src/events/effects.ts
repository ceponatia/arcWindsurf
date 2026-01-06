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
]);

export type EffectType = z.infer<typeof EffectTypeSchema>;

export const MovedEffectSchema = z.object({
  type: z.literal('MOVED'),
  actorId: z.string(),
  fromLocationId: z.string(),
  toLocationId: z.string(),
});

export const SpokeEffectSchema = z.object({
  type: z.literal('SPOKE'),
  actorId: z.string(),
  content: z.string(),
  targetActorId: z.string().optional(),
});

export const EffectSchema = z.discriminatedUnion('type', [
  MovedEffectSchema,
  SpokeEffectSchema,
  z.object({ type: z.literal('DAMAGED'), actorId: z.string(), amount: z.number(), sourceId: z.string().optional() }),
  z.object({ type: z.literal('ITEM_ACQUIRED'), actorId: z.string(), itemId: z.string() }),
  z.object({ type: z.literal('ITEM_DROPPED'), actorId: z.string(), itemId: z.string() }),
  z.object({ type: z.literal('ITEM_USED'), actorId: z.string(), itemId: z.string() }),
  z.object({ type: z.literal('HEALED'), actorId: z.string(), amount: z.number() }),
  z.object({ type: z.literal('DIED'), actorId: z.string() }),
]);

export type Effect = z.infer<typeof EffectSchema>;
