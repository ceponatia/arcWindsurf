# Schema Testing Guide for Agentic Coders

**Date**: January 2026
**Audience**: AI coding agents with medium reasoning effort and limited context windows (128k)
**Purpose**: How to write high-signal schema tests that catch "invisible drift" bugs

---

## Quick Reference: Test Checklist

For **every schema you touch**, ensure these exist:

| Test Type | What It Catches | Priority |
|-----------|-----------------|----------|
| **Happy path** | "Does it parse valid data?" | P0 |
| **Failure cases** | "Does it reject bad data?" | P0 |
| **Defaults** | "Are defaults applied and stable?" | P0 |
| **Refinements** | "Are constraints enforced?" | P1 |
| **Backward compat** | "Do old payloads still parse?" | P1 (Boundary Spec) |
| **Serialization** | "Does JSON round-trip work?" | P1 (Boundary Spec) |

**If you only have time for one thing:** Write a backward compatibility test with a fixture file.

---

## Part 1: How to Identify Which Tests to Write

### Step 1: Determine the Category

Look at the schema's folder location:

```text
🌍 World Spec (domain entities):
   character/, body-regions/, items/, location/, persona/,
   simulation/, state/, time/, races/, tags/

✂️ Boundary Spec (cross technical seams):
   api/, events/, shared/, utils/schema-helpers.ts
```

**Boundary Spec schemas get MORE tests** — they're where runtime breakage happens.

### Step 2: Check Import Count

Run this command to see how many packages import a schema:

```bash
grep -r "from '@minimal-rpg/schemas'" packages/*/src --include="*.ts" | \
  grep "SchemaName" | wc -l
```

Higher import count = higher blast radius = more tests needed.

### Step 3: Ask These Questions

Answer YES/NO for the schema you're working on:

1. **Is this schema used in API request/response bodies?** → Add serialization + backward compat tests
2. **Does this schema have `.default()` or `.transform()`?** → Add defaults test
3. **Does this schema have `.min()`, `.max()`, `.nonempty()`, enums?** → Add refinements test
4. **Has this schema changed in the last 30 days?** → Add backward compat fixture
5. **Does this schema contain `Date`, `bigint`, or custom types?** → Add serialization test

### Step 4: Prioritize by Pain

If you're adding tests to an existing codebase, prioritize:

1. **Schemas that have caused bugs before** (check git blame, issue tracker)
2. **Schemas with discriminated unions** (`z.discriminatedUnion`) — these break silently
3. **Schemas used in events/pubsub** — no compile-time safety
4. **Schemas with complex defaults** — drift causes weird behavior

---

## Part 2: How Test Files Should Be Scoped

### Rule: One Test File Per Schema File (Not Per Domain)

**Bad:** `character.test.ts` covering 15 schemas
**Good:** `character.profile.test.ts` covering `CharacterProfileSchema`

### Why This Matters for Agents

1. **Fits in context window** — A 50-100 line test file is easy to reason about
2. **Easier to update** — When you change a schema, you know exactly which test file to update
3. **Parallel work** — Multiple agents can work on different test files without conflicts
4. **Clear ownership** — File name tells you what it tests

### Naming Convention

```text
test/
├── api.prompt-config.test.ts      # Tests src/api/promptConfigSchemas.ts
├── api.parsed-input.test.ts       # Tests src/api/parsed-input.ts
├── events.world-event.test.ts     # Tests src/events/index.ts (WorldEventSchema)
├── character.profile.test.ts      # Tests src/character/characterProfile.ts
├── character.appearance.test.ts   # Tests src/character/appearance.ts
└── fixtures/                      # JSON fixtures for backward compat
    ├── character-profile-v1.json
    └── world-event-legacy.json
```

### When to Combine

Only combine tests when:

- Testing **helper functions** that operate on multiple schemas together
- Testing **cross-schema validation** (e.g., "inventory item must reference valid item definition")

---

## Part 3: Test Templates

Copy these templates. Fill in the blanks. Don't overthink.

### Template A: Basic Schema Test (World Spec)

```typescript
import { describe, expect, test } from 'vitest';
import { MySchema } from '../src/domain/my-schema.js';

describe('domain/my-schema', () => {
  // 1. Happy path - minimal valid object
  test('parses minimal valid object', () => {
    const minimal = {
      id: 'test-1',
      name: 'Test',
      // ... only required fields
    };
    expect(() => MySchema.parse(minimal)).not.toThrow();
  });

  // 2. Happy path - realistic object
  test('parses realistic object with optional fields', () => {
    const realistic = {
      id: 'test-2',
      name: 'Realistic Test',
      description: 'A more complete example',
      // ... include optional fields
    };
    const parsed = MySchema.parse(realistic);
    expect(parsed.name).toBe('Realistic Test');
  });

  // 3. Failure cases - required fields
  test('rejects missing required fields', () => {
    expect(() => MySchema.parse({})).toThrow();
    expect(() => MySchema.parse({ id: '' })).toThrow();
  });

  // 4. Defaults
  test('applies defaults', () => {
    const parsed = MySchema.parse({ id: 'test-3', name: 'Test' });
    expect(parsed.status).toBe('active'); // or whatever the default is
  });

  // 5. Refinements
  test('enforces refinements', () => {
    // Test min/max/nonempty/enum constraints
    expect(() => MySchema.parse({ id: 'x', name: '' })).toThrow(); // min(1)
    expect(() => MySchema.parse({ id: 'x', name: 'ok', count: -1 })).toThrow(); // min(0)
  });
});
```

### Template B: Boundary Spec Test (API/Events)

```typescript
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MyApiSchema } from '../src/api/my-schema.js';

describe('api/my-schema', () => {
  // 1-5: Same as Template A (happy path, failures, defaults, refinements)

  // 6. Backward compatibility - CRITICAL for boundary schemas
  test('parses legacy v1 payload', () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, 'fixtures/my-schema-v1.json'), 'utf-8')
    );
    expect(() => MyApiSchema.parse(fixture)).not.toThrow();
  });

  // 7. Serialization round-trip
  test('survives JSON round-trip', () => {
    const original = {
      id: 'test-1',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
      // ... fields that might serialize oddly
    };

    const parsed = MyApiSchema.parse(original);
    const serialized = JSON.stringify(parsed);
    const deserialized = JSON.parse(serialized);

    // Parse again - this is where Date/BigInt issues surface
    expect(() => MyApiSchema.parse(deserialized)).not.toThrow();
  });

  // 8. Date handling (if schema has dates)
  test('handles ISO date strings from JSON', () => {
    const fromJson = {
      id: 'test-1',
      timestamp: '2024-01-01T00:00:00.000Z', // string, not Date
    };
    // This should either parse or reject - document which!
    expect(() => MyApiSchema.parse(fromJson)).toThrow(); // or not.toThrow()
  });
});
```

### Template C: Fixture File

Create `test/fixtures/my-schema-v1.json`:

```json
{
  "_fixture_meta": {
    "schema": "MyApiSchema",
    "version": "1.0.0",
    "created": "2024-01-15",
    "note": "Captured from production before field X was added"
  },
  "id": "legacy-1",
  "name": "Legacy Object",
  "oldField": "this field was removed in v2"
}
```

**Important:** Never delete fixture files. Only add new ones when the schema changes.

### Template D: Discriminated Union Test

```typescript
import { describe, expect, test } from 'vitest';
import { UnionSchema } from '../src/events/index.js';

describe('events/union-schema', () => {
  // Test EACH variant of the union
  test('parses variant A', () => {
    const variantA = { type: 'VARIANT_A', fieldA: 'value' };
    expect(() => UnionSchema.parse(variantA)).not.toThrow();
  });

  test('parses variant B', () => {
    const variantB = { type: 'VARIANT_B', fieldB: 123 };
    expect(() => UnionSchema.parse(variantB)).not.toThrow();
  });

  // CRITICAL: Test unknown discriminator
  test('rejects unknown type discriminator', () => {
    const unknown = { type: 'UNKNOWN_TYPE', data: {} };
    expect(() => UnionSchema.parse(unknown)).toThrow();
  });

  // Test that each variant enforces its own shape
  test('rejects variant A with variant B fields', () => {
    const mismatch = { type: 'VARIANT_A', fieldB: 123 }; // wrong field
    expect(() => UnionSchema.parse(mismatch)).toThrow();
  });
});
```

---

## Part 4: What Makes Tests "Real" vs "Busywork"

### Red Flags (Busywork Tests)

```typescript
// BAD: Only tests that it parses
test('parses', () => {
  expect(() => Schema.parse(validData)).not.toThrow();
});

// BAD: Tests implementation detail, not contract
test('has correct type', () => {
  expect(typeof Schema).toBe('object');
});

// BAD: Duplicates TypeScript's job
test('returns correct type', () => {
  const result = Schema.parse(data);
  expect(result).toHaveProperty('id');
});
```

### Green Flags (Real Tests)

```typescript
// GOOD: Tests a specific constraint
test('rejects empty name', () => {
  expect(() => Schema.parse({ name: '' })).toThrow();
});

// GOOD: Tests default value stability
test('defaults status to active', () => {
  const parsed = Schema.parse({ name: 'test' });
  expect(parsed.status).toBe('active');
});

// GOOD: Tests backward compatibility
test('parses legacy payload without new required field', () => {
  const legacy = loadFixture('schema-v1.json');
  expect(() => Schema.parse(legacy)).not.toThrow();
});

// GOOD: Tests serialization boundary
test('Date survives JSON round-trip', () => {
  const original = Schema.parse({ timestamp: new Date() });
  const roundTripped = Schema.parse(JSON.parse(JSON.stringify(original)));
  expect(roundTripped.timestamp).toBeInstanceOf(Date);
});
```

---

## Part 5: Analysis of Current Tests

### What's Good

| File | Strengths |
|------|-----------|
| `api.schemas.test.ts` | Tests refinements (bounds, nonempty), defaults |
| `tags.schemas-helpers.test.ts` | Explicit defaults test, helper behavior |
| `items.inventory.test.ts` | Multiple valid shapes, invalid rejections |
| `shared.record-helpers.test.ts` | Edge cases (undefined, missing) |

### What's Missing

| Gap | Impact | Fix |
|-----|--------|-----|
| **No backward compat tests** | Schema changes silently break consumers | Add fixture files |
| **No serialization tests** | Date/BigInt issues surface at runtime | Add round-trip tests |
| **No fixtures directory** | Tests are brittle to schema changes | Create `test/fixtures/` |
| `events.world-event.test.ts` missing Date round-trip | TICK events with Date break over JSON | Add serialization test |

### Priority Fixes

1. **Create `test/fixtures/` directory** with legacy payloads
2. **Add serialization test to `events.world-event.test.ts`** — Date handling is broken
3. **Add backward compat test to `api.schemas.test.ts`** — highest traffic boundary

---

## Part 6: Quick Decision Tree for Agents

```text
Q: Am I adding/changing a schema?
├─ YES → Find or create test file: test/{folder}.{schema-name}.test.ts
│   ├─ Does test file exist?
│   │   ├─ YES → Add tests for your changes
│   │   └─ NO → Create from Template A or B
│   └─ Is this a Boundary Spec (api/events/shared)?
│       ├─ YES → MUST have: fixture file + serialization test
│       └─ NO → Defaults + refinements sufficient
└─ NO → Do I need to write tests?
    └─ Check if existing tests cover the behavior you're relying on
```

---

## Part 7: Fixture Management

### Creating a Fixture

```bash
# 1. Export current valid data to fixture
node -e "console.log(JSON.stringify(require('./src/api/my-schema.js').MySchema.parse({...validData}), null, 2))" > test/fixtures/my-schema-v1.json

# 2. Add metadata header manually
```

### When to Create a New Fixture

- **Before** making a breaking change to a schema
- When you discover a payload shape from production logs
- When a bug report includes the failing payload

### Fixture Naming

```text
{schema-name}-v{version}.json     # Versioned snapshots
{schema-name}-legacy.json         # Pre-versioning payloads
{schema-name}-edge-{case}.json    # Specific edge cases
```

---

## Part 8: Common Mistakes to Avoid

### Mistake 1: Testing Only Happy Path

```typescript
// INCOMPLETE
test('parses valid data', () => {
  expect(() => Schema.parse(validData)).not.toThrow();
});
// Missing: What happens with INVALID data?
```

### Mistake 2: Hardcoding Dates in Tests

```typescript
// FRAGILE
test('has correct timestamp', () => {
  const parsed = Schema.parse({ timestamp: new Date() });
  expect(parsed.timestamp.getTime()).toBe(1705312800000); // breaks tomorrow
});

// ROBUST
test('preserves timestamp', () => {
  const now = new Date('2024-01-15T12:00:00Z');
  const parsed = Schema.parse({ timestamp: now });
  expect(parsed.timestamp.toISOString()).toBe(now.toISOString());
});
```

### Mistake 3: Testing Zod Itself

```typescript
// POINTLESS - you're testing Zod, not your schema
test('string is a string', () => {
  expect(z.string().parse('hello')).toBe('hello');
});
```

### Mistake 4: Giant Test Files

If a test file exceeds 200 lines, split it. One file per schema.

---

## Summary for Agents

1. **Scope:** One test file per schema file
2. **Location:** `test/{folder}.{schema-name}.test.ts`
3. **Minimum tests:** Happy path + failure cases + defaults
4. **Boundary schemas (api/events):** Add fixtures + serialization
5. **Never delete fixtures** — only add new ones
6. **Test the contract, not the implementation**

When in doubt: **Write a backward compatibility test with a fixture file.**
