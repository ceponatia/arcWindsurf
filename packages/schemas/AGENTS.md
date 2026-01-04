# @minimal-rpg/schemas

## Purpose

Shared Zod schemas and TypeScript types for the entire monorepo. The single source of truth for data shapes and validation.

## Scope

- Zod schemas for all domain entities (characters, settings, sessions, state)
- TypeScript type definitions inferred from schemas
- Serialization and deserialization helpers
- No runtime logic beyond validation

## Utility Helpers

The package provides common Zod schema helpers in `src/utils/`:

- `nullableOptional(schema)`: Creates a schema that accepts `T | null | undefined` and transforms `null` to `undefined`. Useful for database fields that might be null but should be treated as optional in domain objects.
- `numericString`: A schema that accepts a string and transforms it to a number. Returns `undefined` if the string is empty or cannot be parsed as a number.

## Package Connections

This package has no internal workspace dependencies. It is imported by nearly every other package:

- **agents**, **api**, **characters**, **generator**, **governor**, **retrieval**, **state-manager**, **ui**, **utils**, **web**

All packages depend on schemas for type safety and runtime validation.
