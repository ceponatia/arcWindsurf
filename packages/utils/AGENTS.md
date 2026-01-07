# @minimal-rpg/utils

## Purpose

Cross-package utility functions. Provides domain-agnostic helpers for parsing, formatting, error handling, and common operations.

## Scope

- Cross-package utility functions (errors, fetch, forms)
- Parsing and formatting logic (body parser, attribute parser, JSON helpers)
- Lightweight domain-agnostic helpers
- Types supporting exported utilities

## Package Connections

- **schemas**: Uses shared types for utility function signatures
- **api**, **characters**, **governor**, **web**: Import utils for shared helper functions

This package should remain domain-agnostic. Domain-specific logic belongs in the appropriate domain package.

## Note on Record Helpers

Type-safe record access helpers (`getRecord`, `setRecord`, etc.) have been moved to `@minimal-rpg/schemas` to avoid circular dependencies. Import them from `@minimal-rpg/schemas` instead of `@minimal-rpg/utils`.
