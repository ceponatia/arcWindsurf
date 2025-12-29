// Package barrel: flat re-exports and namespaced accessors
export * from './shared/index.js';
export * from './body-regions/index.js';
export * from './character/index.js';
export * from './persona/index.js';
export * from './setting/index.js';
export * from './location/index.js';
export * from './inventory/index.js';
export * from './items/index.js';
export * from './tags/index.js';
export * from './state/index.js';
export * from './time/index.js';
export * from './npc-tier/index.js';
export * from './schedule/index.js';
export * from './simulation/index.js';
export * from './affinity/index.js';

// Namespaced exports for convenience (avoid clashing with type names)
export * as Shared from './shared/index.js';
export * as Character from './character/index.js';
export * as Persona from './persona/index.js';
export * as Setting from './setting/index.js';
export * as Location from './location/index.js';
export * as Inventory from './inventory/index.js';
export * as Items from './items/index.js';
export * as Tags from './tags/index.js';
export * as State from './state/index.js';
export * as Time from './time/index.js';
export * as NpcTier from './npc-tier/index.js';
export * as Schedule from './schedule/index.js';
export * as Simulation from './simulation/index.js';
export * as Affinity from './affinity/index.js';

// API-facing schemas (prompt configuration, etc.)
export * from './api/promptConfigSchemas.js';
export * from './api/tags.js';
export * from './api/sensory-context.js';
export * from './api/parsed-input.js';
export * from './api/action-sequence.js';
export * from './api/npc-config.js';
export { DEFAULT_NPC_RESPONSE_CONFIG } from './api/npc-config.js';
