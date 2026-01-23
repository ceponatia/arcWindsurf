# Contracts Package Evaluation

**Date**: January 2026
**Status**: Analysis Complete

---

## Executive Summary

**Recommendation: Do NOT create a separate `packages/contracts` package.**

The existing `@minimal-rpg/schemas` package already serves as the contracts package. The real issue is **insufficient testing coverage**, not structural organization. Adding a new package would create confusion and migration burden without solving the actual problem.

**Instead, focus on:**

1. Adding comprehensive tests to `@minimal-rpg/schemas`
2. Adding API router smoke tests
3. Organizing schemas by intent (not splitting packages)
4. Enforcing import discipline across packages

---

## Why "Change A Breaks Routes" Happens

In an LLM-driven codebase, the most common cause of "seemingly unrelated" breakages is:

```text
1. A schema/type changed
2. Downstream code still compiles (or typechecks "enough")
3. Runtime assumptions changed
4. Routes break in weird places
```

**The real diagnosis:** You don't have enough tests at the boundary.

Types are compile-time. Your **real contracts are runtime**: schemas, validations, serialization rules. If you want the most robust setup in an LLM-coded monorepo:

- A schemas package with Zod schemas as source of truth
- Types generated from schemas (`z.infer<typeof X>`)
- Packages import schemas for validation at boundaries, types for convenience

This prevents "looks fine at compile time but runtime broke routes."

---

## How to Keep Schemas from Becoming a Junk Drawer

**The fix is organization, not splitting packages.**

Inside `@minimal-rpg/schemas`, think in **two categories**. You don't have to move files — just **treat them differently**.

### 🌍 "World Spec" — These Define Reality

```text
character/
body-regions/
items/
location/
persona/
simulation/
state/
time/
races/
tags/
```

These change slowly and should be tested for **invariants**, not UI behavior.

**Test focus:**

- Schema shape stability
- Default values
- Domain rule enforcement (e.g., "personality array must be non-empty")

### ✂️ "Boundary Spec" — These Cross Technical Seams

```text
api/
events/
shared/
utils/schema-helpers.ts
```

These need:

- **Strict parsing tests** (valid/invalid inputs)
- **Backward compatibility tests** (old payloads still parse)
- **Serialization tests** (JSON round-trip, date handling)

### Why the Distinction Matters

World Spec schemas define "what the game world is." Boundary Spec schemas define "how data moves between systems." When an LLM refactors a Boundary Spec schema and breaks serialization, routes fail at runtime even though TypeScript compiles. Testing boundaries catches this.

### Current State vs Recommended

| Current Folder | Category | Status |
|----------------|----------|--------|
| `character/` | World Spec | ✅ Good |
| `body-regions/` | World Spec | ✅ Good |
| `items/` | World Spec | ✅ Good |
| `location/` | World Spec | ✅ Good |
| `state/` | World Spec | ✅ Good |
| `time/` | World Spec | ✅ Good |
| `api/` | Boundary Spec | ⚠️ Missing response DTOs |
| `events/` | Boundary Spec | ✅ Good |
| `shared/` | Boundary Spec | ✅ Good |

The current structure is **already well-organized**. The main gap is `api/` missing response DTOs that currently live in `packages/api/src/types.ts`.

---

## Current State Analysis

### Package Structure Overview

| Package | Type Files | Purpose | Should Move to Contracts? |
|---------|-----------|---------|---------------------------|
| `schemas` | 19 subdirs, 173 items | Zod schemas + inferred types | **Already is contracts** |
| `db` | 7 type files (438 lines) | DB row types, SQL helpers | ❌ DB-specific |
| `api` | 10 type files | Response shapes, route types | ⚠️ Partial (response DTOs) |
| `actors` | 3 type files | Actor state, lifecycle | ❌ Package-internal |
| `llm` | 2 type files | LLM provider interfaces | ❌ Package-internal |
| `web` | 6 type files | React props, form state | ❌ UI-specific |
| `characters` | 5 type files | Service types | ❌ Package-internal |

### Cross-Cutting Types Identified

Types used in **3+ packages** that cross boundaries:

| Type | Source | Packages Using | Verdict |
|------|--------|----------------|---------|
| `CharacterProfile` | schemas | 88 files, 10+ packages | ✅ Already in contracts |
| `WorldEvent` | schemas | actors, bus, api, services | ✅ Already in contracts |
| `GameTime` | schemas | 6+ packages | ✅ Already in contracts |
| `BodyMap` / `BodyRegionData` | schemas | 5+ packages | ✅ Already in contracts |
| `PersonalityMap` | schemas | 5+ packages | ✅ Already in contracts |
| `SessionMessage` | db/types | api, web | ⚠️ Should move to schemas |
| `ApiError` | api/types | api, web | ⚠️ Should move to schemas |

### Current Test Coverage in `@minimal-rpg/schemas`

```text
packages/schemas/test/
├── character.appearance.test.ts    # Helper functions only
├── character.regions.side.test.ts  # Region helpers
├── resolveSensoryProfile.test.ts   # New resolver
├── seed.profiles.test.ts           # Seed data validation
├── state.occupancy.test.ts         # State schemas
├── state.proximity.test.ts         # State schemas
└── time.utils.test.ts              # Time utilities

Total: 7 test files
Missing: Schema parsing, defaults, refinements, backward compatibility
```

---

## Why `@minimal-rpg/schemas` IS the Contracts Package

The schemas package already follows the recommended pattern:

```typescript
// Zod schema as source of truth
export const CharacterProfileSchema = CharacterBasicsSchema.extend({
  personality: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
  physique: z.union([z.string().min(1), PhysiqueSchema]).optional(),
  body: BodyMapSchema.optional(),
  sensoryProfile: SensoryProfileConfigSchema.optional(),
  // ...
});

// Type inferred from schema
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;
```

**This is exactly the right pattern.** The problem is:

1. **Insufficient tests** to catch breaking changes
2. **Some API response types** live outside schemas
3. **No backward compatibility tests** for old payloads

---

## The Next Best Step (No Big Refactor)

Do **two things** that catch 80% of "random breakage" fast:

### 1. Schema Tests Explode in Coverage (P0)

- Parse valid/invalid
- Defaults
- Refinements
- Round-trip JSON behavior
- Backwards-compat snapshots

### 2. API "Router Builds" Smoke Test (P0)

- Import/build router
- Ensure key routes exist
- Call 1-2 representative handlers with bad input and assert error shape

```typescript
// packages/api/test/smoke/router-builds.test.ts
import { describe, it, expect } from 'vitest';
import { app } from '../../src/serverImpl.js';

describe('API router smoke test', () => {
  it('router builds without error', () => {
    expect(app).toBeDefined();
    expect(app.routes).toBeDefined();
  });

  it('key routes exist', () => {
    const routePaths = app.routes.map(r => r.path);

    // Core routes must exist
    expect(routePaths).toContain('/api/health');
    expect(routePaths).toContain('/api/sessions');
    expect(routePaths).toContain('/api/characters');
  });

  it('returns proper error shape for bad input', async () => {
    const res = await app.request('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'payload' }),
    });

    const body = await res.json();

    // Assert error shape matches ApiError contract
    expect(body.ok).toBe(false);
    expect(body.error).toBeDefined();
  });
});
```

---

## Recommendations

### 1. Add Comprehensive Schema Tests (P0)

Create `packages/schemas/test/contracts/` with tests for:

#### Schema Parsing Tests

```typescript
// test/contracts/character-profile.test.ts
describe('CharacterProfileSchema contracts', () => {
  describe('parsing', () => {
    it('parses minimal valid profile', () => {
      const minimal = {
        name: 'Test',
        gender: 'male',
        race: 'Human',
        personality: 'friendly',
      };
      expect(() => CharacterProfileSchema.parse(minimal)).not.toThrow();
    });

    it('rejects invalid profile', () => {
      const invalid = { name: '' }; // Missing required fields
      expect(() => CharacterProfileSchema.parse(invalid)).toThrow();
    });
  });

  describe('defaults', () => {
    it('applies default values for optional fields', () => {
      const result = CharacterProfileSchema.parse({
        name: 'Test',
        gender: 'male',
        race: 'Human',
        personality: 'friendly',
      });
      // Verify defaults are applied
      expect(result.sensoryProfile).toBeUndefined(); // Optional, no default
    });
  });

  describe('refinements', () => {
    it('validates personality array is non-empty', () => {
      expect(() => CharacterProfileSchema.parse({
        name: 'Test',
        gender: 'male',
        race: 'Human',
        personality: [], // Should fail - nonempty()
      })).toThrow();
    });
  });
});
```

#### Backward Compatibility Tests

```typescript
// test/contracts/backward-compat.test.ts
describe('backward compatibility', () => {
  const LEGACY_PAYLOADS = {
    v1_character: {
      name: 'Old Character',
      gender: 'female',
      race: 'Elf',
      personality: 'wise, calm',
      // v1 didn't have sensoryProfile
    },
    v2_character: {
      name: 'Newer Character',
      gender: 'male',
      race: 'Dwarf',
      personality: ['gruff', 'loyal'],
      body: { hair: { scent: { description: 'earthy' } } },
      // v2 added body but not sensoryProfile
    },
  };

  it('parses v1 character payload', () => {
    const result = CharacterProfileSchema.safeParse(LEGACY_PAYLOADS.v1_character);
    expect(result.success).toBe(true);
  });

  it('parses v2 character payload', () => {
    const result = CharacterProfileSchema.safeParse(LEGACY_PAYLOADS.v2_character);
    expect(result.success).toBe(true);
  });
});
```

#### Serialization Boundary Tests

```typescript
// test/contracts/serialization.test.ts
describe('serialization boundaries', () => {
  it('round-trips through JSON', () => {
    const original: CharacterProfile = {
      name: 'Test',
      gender: 'male',
      race: 'Human',
      personality: 'friendly',
      physique: { height: 'average', build: 'athletic' },
    };

    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized);
    const parsed = CharacterProfileSchema.parse(deserialized);

    expect(parsed.name).toBe(original.name);
    expect(parsed.physique).toEqual(original.physique);
  });

  it('handles Date fields correctly', () => {
    // GameTime or other date-containing types
    const timeData = { day: 1, hour: 12, minute: 30 };
    const parsed = GameTimeSchema.parse(timeData);
    expect(parsed.hour).toBe(12);
  });
});
```

### 2. Move API Response Types to Schemas (P1)

Currently in `packages/api/src/types.ts`:

```typescript
export interface ApiError {
  ok: false;
  error: string | Record<string, unknown>;
  details?: unknown;
}

export interface Speaker {
  id: string;
  name: string;
  profilePic?: string;
  emotePic?: string;
}
```

**Move to `packages/schemas/src/api/responses.ts`:**

```typescript
// packages/schemas/src/api/responses.ts
import { z } from 'zod';

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.union([z.string(), z.record(z.string(), z.unknown())]),
  details: z.unknown().optional(),
});

export const SpeakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  profilePic: z.string().url().optional(),
  emotePic: z.string().url().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Speaker = z.infer<typeof SpeakerSchema>;
```

### 3. Enforce Import Discipline (P2)

Add ESLint rule to prevent importing types from deep paths:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@minimal-rpg/schemas/src/*'],
          message: 'Import from @minimal-rpg/schemas, not deep paths',
        },
        {
          group: ['@minimal-rpg/db/src/types'],
          message: 'DB types should only be used in db/api packages',
        },
      ],
    }],
  },
};
```

### 4. Test Priority by Package

| Schema Category | Files | Test Priority | Reason |
|-----------------|-------|---------------|--------|
| `character/*` | 8 | **P0** | Used in 88+ files, core entity |
| `events/*` | 4 | **P0** | Cross-package event contracts |
| `state/*` | 11 | **P1** | Session state, frequent changes |
| `api/*` | 6 | **P1** | API boundaries, serialization |
| `body-regions/*` | 53 | **P1** | Complex nested types |
| `location/*` | 8 | **P2** | Stable, less frequent changes |
| `time/*` | 5 | **P2** | Already has tests |

---

## What NOT to Do

### ❌ Don't Create `packages/contracts`

This would:

- Require migrating 237+ import statements
- Create confusion about schemas vs contracts
- Not solve the actual testing problem
- Add build complexity

### ❌ Don't Move DB Row Types

Types like `CharacterProfileRow`, `SessionMessage` in `db/types.ts` are **database-specific**:

```typescript
export interface CharacterProfileRow extends DbRow {
  id: string;
  profileJson: string;  // <-- This is a string, not CharacterProfile
  createdAt?: Date;
}
```

These should stay in `@minimal-rpg/db` because they describe the database schema, not the domain model.

### ❌ Don't Mix React/Hono Types with Domain Types

Types like these should stay in their packages:

- `packages/web/src/features/character-studio/types.ts` → Form state types
- `packages/api/src/routes/game/sessions/types.ts` → Route handler types
- `packages/ui/src/components/*/types.ts` → Component prop types

---

## Implementation Checklist

### Phase 1: Testing Foundation (1-2 days)

- [ ] Create `packages/schemas/test/contracts/` directory
- [ ] Add `character-profile.test.ts` with parsing/defaults/refinements
- [ ] Add `backward-compat.test.ts` with legacy payload snapshots
- [ ] Add `serialization.test.ts` for JSON round-trip tests
- [ ] Add `events.test.ts` for WorldEvent contracts
- [ ] Add `packages/api/test/smoke/router-builds.test.ts`
- [ ] Add route existence assertions
- [ ] Add error shape assertions for bad input

### Phase 2: API Response Migration (0.5 day)

- [ ] Create `packages/schemas/src/api/responses.ts`
- [ ] Move `ApiError`, `Speaker`, `HealthResponse` to schemas
- [ ] Update imports in api and web packages
- [ ] Add tests for response schemas

### Phase 3: Import Enforcement (0.5 day)

- [ ] Add ESLint no-restricted-imports rule
- [ ] Fix any violations
- [ ] Document import conventions in README

### Phase 4: Continuous Validation

- [ ] Add CI check for schema test coverage
- [ ] Consider adding schema snapshot tests
- [ ] Document "contract change" process in CONTRIBUTING.md

---

## Litmus Test Results

Applying the user's litmus test to current types:

| Type | Used in 3+? | Crosses boundary? | Would annoy if changed? | Verdict |
|------|-------------|-------------------|-------------------------|---------|
| `CharacterProfile` | ✅ Yes (10+) | ✅ web↔api↔db | ✅ Yes | ✅ In schemas |
| `WorldEvent` | ✅ Yes (5+) | ✅ actors↔bus↔api | ✅ Yes | ✅ In schemas |
| `GameTime` | ✅ Yes (6+) | ✅ api↔services↔state | ✅ Yes | ✅ In schemas |
| `ApiError` | ✅ Yes (3+) | ✅ api↔web | ⚠️ Moderate | ⚠️ Move to schemas |
| `LLMMessage` | ⚠️ Maybe (2) | ✅ llm↔actors | ⚠️ Moderate | Keep in llm |
| `DbRow` | ❌ No (1) | ❌ db only | ❌ No | Keep in db |

---

## Conclusion

The `@minimal-rpg/schemas` package **is** your contracts package. It just needs:

1. **Schema tests explode in coverage** (parsing, defaults, refinements, backward-compat)
2. **API router smoke tests** (router builds, key routes exist, error shapes)
3. **API response types moved in** (minor migration)
4. **Import discipline enforced** (linting)

**Don't restructure. Test what you have.**

The fix is organization within the existing package, not splitting packages. The current folder structure is already well-organized by intent—the gap is testing, not architecture.
