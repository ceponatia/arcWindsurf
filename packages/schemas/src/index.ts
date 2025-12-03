// Package barrel: flat re-exports and namespaced accessors
export * from './character/index.js';
export * from './setting/index.js';
export * from './tags/index.js';

// Namespaced exports for convenience (avoid clashing with type names)
export * as Character from './character/index.js';
export * as Setting from './setting/index.js';
export * as Tags from './tags/index.js';

// API-facing schemas (prompt configuration, etc.)
export * from './api/promptConfigSchemas.js';
export * from './api/tags.js';
