// Package barrel: flat re-exports and namespaced accessors
export * from './character/index.js';
export * from './setting/index.js';

// Namespaced exports for convenience (avoid clashing with type names)
export * as Character from './character/index.js';
export * as Setting from './setting/index.js';
