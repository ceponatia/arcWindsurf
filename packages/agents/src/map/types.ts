import type { IntentType } from '../core/types.js';

/**
 * Intent types handled by the map/navigation domain.
 */
export const MAP_INTENT_TYPES = ['move', 'look'] as const satisfies readonly IntentType[];

export type MapIntentType = (typeof MAP_INTENT_TYPES)[number];
