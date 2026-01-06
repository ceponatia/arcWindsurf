# @minimal-rpg/utils

## Purpose

Cross-package utility functions. Provides domain-agnostic helpers for parsing, formatting, error handling, and common operations.

## Scope

- Cross-package utility functions (errors, fetch, forms)
- Parsing and formatting logic (body parser, attribute parser, JSON helpers)
- Type-safe record access helpers for internal game schemas
- Lightweight domain-agnostic helpers
- Types supporting exported utilities

## Package Connections

- **schemas**: Uses shared types for utility function signatures
- **api**, **characters**, **governor**, **web**: Import utils for shared helper functions

This package should remain domain-agnostic. Domain-specific logic belongs in the appropriate domain package.

## Record Helpers (`shared/record-helpers.ts`)

Type-safe utilities for accessing `Record<K, V>` objects where `K` is a closed TypeScript union type.

### Security Boundary Rules

**✅ USE these helpers for:**
- Internal game schemas (AffinityDimension, BodyRegion, etc.)
- Typed enums and validated state
- Known, finite type unions

**❌ DO NOT USE for:**
- LLM output (parse and validate first)
- API input (validate at boundaries)
- User-provided keys
- External data sources

All external input MUST be validated at boundaries (API/web/LLM parsing) before reaching internal logic that uses these helpers.

### Available Helpers

#### `getRecord<K, V>(record: Record<K, V>, key: K): V`

Type-safe getter for required keys.

```typescript
const weights: Record<AffinityDimension, number> = {...};
const fondness = getRecord(weights, 'fondness');
```

#### `getRecordOptional<K, V>(record: Record<K, V> | undefined, key: K): V | undefined`

Type-safe getter when the record itself may be undefined.

```typescript
const body: Record<BodyRegion, RegionData> | undefined = {...};
const data = getRecordOptional(body, 'feet');
```

#### `getPartialRecord<K, V>(obj: Partial<Record<K, V>>, key: K): V | undefined`

Type-safe getter for objects with optional properties.

```typescript
const affinity: { fondness: number; attraction?: number } = {...};
const value = getPartialRecord(affinity, 'attraction');
```

#### `setRecord<K, V>(record: Record<K, V>, key: K, value: V): void`

Type-safe setter for required keys. Higher risk - use only for validated internal state.

```typescript
const result: Record<AffinityDimension, number> = {...};
setRecord(result, 'trust', 50);
```

#### `setPartialRecord<K, V>(obj: Partial<Record<K, V>>, key: K, value: V | undefined): void`

Type-safe setter for optional properties. Higher risk - use only for validated internal state.

```typescript
const affinity: { fondness: number; attraction?: number } = {...};
setPartialRecord(affinity, 'attraction', 50);
```

#### `getArraySafe<T>(array: readonly T[], index: number): T | undefined`

Safe array access with bounds checking.

```typescript
const responses = ['a', 'b', 'c'];
const item = getArraySafe(responses, 5); // undefined, not error
```

#### `getTuple<C, N>(collection: C, index: N): ValueAtIndex<C, N>`

Type-safe access for tuples or number-keyed records with numeric literal indices.

```typescript
const thresholds: readonly [number, number, number] = [0, 10, 20];
const value = getTuple(thresholds, 1); // 10

type Level = 0 | 1 | 2 | 3;
const multipliers: Record<Level, number> = { 0: 1, 1: 0.5, 2: 0.25, 3: 0 };
const mult = getTuple(multipliers, 2); // 0.25
```

### Why These Helpers?

These helpers provide:
1. **Centralized audit points** for dynamic property access
2. **ESLint security rule compliance** (suppression is localized and documented)
3. **Type safety** enforced by TypeScript's type system
4. **Consistent patterns** across the codebase
5. **Clear security boundaries** between trusted internal types and untrusted external input
