// Package barrel: flat re-exports and namespaced accessors
export * from './character/index.js';
export * from './setting/index.js';
export * from './location/index.js';
export * from './inventory/index.js';
export * from './items/index.js';
export * from './tags/index.js';

// Namespaced exports for convenience (avoid clashing with type names)
export * as Character from './character/index.js';
export * as Setting from './setting/index.js';
export * as Location from './location/index.js';
export * as Inventory from './inventory/index.js';
export * as Items from './items/index.js';
export * as Tags from './tags/index.js';

// API-facing schemas (prompt configuration, etc.)
export * from './api/promptConfigSchemas.js';
export * from './api/tags.js';
