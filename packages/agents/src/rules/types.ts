import type { IntentType } from '../core/types.js';

/**
 * Intent types handled by the rules/system domain.
 */
export const RULES_INTENT_TYPES = [
  'use',
  'take',
  'give',
  'attack',
] as const satisfies readonly IntentType[];

export type RulesIntentType = (typeof RULES_INTENT_TYPES)[number];
