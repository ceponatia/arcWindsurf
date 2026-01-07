import { z } from 'zod';
import { IntentSchema } from './intents.js';
import { EffectSchema } from './effects.js';
import { SystemEventSchema } from './system.js';

export * from './intents.js';
export * from './effects.js';
export * from './system.js';

export const WorldEventSchema = z.discriminatedUnion('type', [
  ...IntentSchema.options,
  ...EffectSchema.options,
  ...SystemEventSchema.options,
]);

export type WorldEvent = z.infer<typeof WorldEventSchema>;
