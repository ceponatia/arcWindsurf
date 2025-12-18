/**
 * Domain-oriented type exports.
 *
 * Keep `core/types.ts` as the stable import surface, while letting
 * implementations organize types by domain.
 */

export * from './intents.js';
export * from './slices.js';
export * from './output.js';
export * from './agent.js';
export * from './config.js';
export * from './registry-types.js';
export * from './errors.js';

export type { AccumulatedSensoryContext } from '@minimal-rpg/schemas';
