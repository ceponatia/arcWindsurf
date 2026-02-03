import { z } from 'zod';
import { WireIntentSchema } from './intents.js';
import { WireEffectSchema } from './effects.js';
import { WireSystemEventSchema } from './system.js';

export const WireWorldEventSchema = z.discriminatedUnion('type', [
  ...WireIntentSchema.options,
  ...WireEffectSchema.options,
  ...WireSystemEventSchema.options,
]);

export type WireWorldEvent = z.infer<typeof WireWorldEventSchema>;
