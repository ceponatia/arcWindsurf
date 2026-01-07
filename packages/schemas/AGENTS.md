# @minimal-rpg/schemas

## Purpose

Shared Zod schemas and TypeScript types for the entire monorepo. The single source of truth for data shapes and validation.

## Scope

- Zod schemas for all domain entities (characters, settings, sessions, state)
- TypeScript type definitions inferred from schemas
- Serialization and deserialization helpers
- Type-safe record access helpers for internal game schemas
- No runtime logic beyond validation

## Utility Helpers

The package provides common helpers:

### Zod Schema Helpers (`src/utils/`)

- `nullableOptional(schema)`: Creates a schema that accepts `T | null | undefined` and transforms `null` to `undefined`. Useful for database fields that might be null but should be treated as optional in domain objects.
- `numericString`: A schema that accepts a string and transforms it to a number. Returns `undefined` if the string is empty or cannot be parsed as a number.

### Record Access Helpers (`src/shared/record-helpers.ts`)

Type-safe utilities for accessing `Record<K, V>` objects where `K` is a closed TypeScript union type.

**Security Boundary Rules:**

- ✅ USE for: Internal game schemas (AffinityDimension, BodyRegion, etc.), typed enums, validated state
- ❌ DO NOT USE for: LLM output, API input, user-provided keys, external data

All external input MUST be validated at boundaries before reaching internal logic that uses these helpers.

**Available Helpers:**

- `getRecord<K, V>(record, key)`: Type-safe getter for required keys
- `getRecordOptional<K, V>(record, key)`: Type-safe getter when record may be undefined
- `getPartialRecord<K, V>(obj, key)`: Type-safe getter for objects with optional properties
- `setRecord<K, V>(record, key, value)`: Type-safe setter (use only for validated internal state)
- `setPartialRecord<K, V>(obj, key, value)`: Type-safe setter for optional properties
- `getArraySafe<T>(array, index)`: Safe array access with bounds checking
- `getTuple<C, N>(collection, index)`: Type-safe tuple/array access for numeric indices

See [record-helpers.ts](src/shared/record-helpers.ts) for detailed documentation and examples.

## Package Connections

This package has no internal workspace dependencies. It is imported by nearly every other package:

- **agents**, **api**, **characters**, **generator**, **governor**, **retrieval**, **state-manager**, **ui**, **utils**, **web**

All packages depend on schemas for type safety and runtime validation.
