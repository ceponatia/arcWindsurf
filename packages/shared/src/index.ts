// Minimal shared types & helpers

// Example branded type helper for stronger nominal typing
export type Brand<T, K extends string> = T & { readonly __brand: K }

// Domain types live in @minimal-rpg/schemas. This package no longer re-exports them.

// Placeholder constant to validate exports
export const version = '0.0.0'
