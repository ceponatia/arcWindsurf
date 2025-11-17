// Package barrel: flat re-exports and namespaced accessors
export * from './character';
export * from './setting';

// Namespaced exports for convenience (avoid clashing with type names)
export * as Character from './character';
export * as Setting from './setting';
