# Technical Debt & Codebase Improvements

> **Created**: February 3, 2026
> **Scope**: Code quality, standardization, and architectural improvements
> **Status**: Analysis complete - prioritization and execution pending

---

## Overview

This document identifies the top 10 improvements to the codebase that focus on quality, consistency, and maintainability rather than new features. These address patterns that create friction for developers, increase bug risk, or hinder long-term scalability.

---

## 1. Consolidate Duplicate Type Definitions

### Problem

Multiple packages independently define the same types with subtle variations, leading to:

- Confusion about which definition is canonical
- Type incompatibility when passing data between packages
- Maintenance burden when changes are needed

### Current State

| Type | Locations | Variations |
|------|-----------|------------|
| `MessageRole` | `@minimal-rpg/db`, `@minimal-rpg/llm`, `@minimal-rpg/web` | db: `'user' \| 'assistant' \| 'system'`<br>llm: adds `'tool'`<br>web: only `'user' \| 'assistant'` |
| `PresenceRecord` | `services/src/presence/types.ts`, `workers/src/heartbeat-monitor.ts` | Identical but duplicated |
| `PresenceScheduler` | Same two locations | workers version missing `startWorldTick` |
| `ValidationResult` | `services/src/rules/validators.ts`, `actors/src/studio-npc/validation.ts`, `web/src/features/session-workspace/store.ts` | Different optional fields |

### Solution

1. Define canonical types in `@minimal-rpg/schemas` under appropriate domain folders
2. Export narrower subtypes where packages need restricted versions
3. Use TypeScript's `Pick<>` or `Omit<>` to derive package-specific variants
4. Add lint rule to detect duplicate type definitions

### Files to Modify

- `packages/schemas/src/shared/message-types.ts` (create)
- `packages/schemas/src/shared/presence-types.ts` (create)
- `packages/schemas/src/shared/validation-types.ts` (create)
- Update imports in db, llm, web, services, workers, actors

### Effort: Low | Impact: High | Priority: P0

---

## 2. Decompose Large Files

### Problem

Several files exceed 700+ lines and violate single-responsibility principle:

| File | Lines | Issues |
|------|-------|--------|
| `web/src/shared/api/client.ts` | 931 | Mixes auth, sessions, characters, settings, locations, tags, personas, hygiene APIs |
| `web/src/features/session-workspace/store.ts` | 884 | Types, validation, state, actions, selectors all in one file |
| `web/src/features/prefab-builder/store.ts` | 775 | Same issue as session-workspace |
| `db/src/utils/client.ts` | 1,175 | Pool management mixed with utilities |
| `web/src/layouts/AppShell.tsx` | 978 | Component too large, mixing routing and layout concerns |

### Solution

Split by domain/responsibility:

**For `api/client.ts`:**

```text
shared/api/
├── http.ts           # Core http() function
├── auth.ts           # authLogin, authMe
├── sessions.ts       # Session CRUD
├── characters.ts     # Character endpoints
├── settings.ts       # Setting endpoints
├── locations.ts      # Location/map endpoints
├── tags.ts           # Tag endpoints
├── personas.ts       # Persona endpoints
├── index.ts          # Re-export all
```

**For Zustand stores:**

```text
session-workspace/
├── store/
│   ├── types.ts      # All interfaces
│   ├── state.ts      # Initial state, state shape
│   ├── actions.ts    # Action creators
│   ├── selectors.ts  # Derived state selectors
│   ├── validation.ts # Step validation logic
│   └── index.ts      # Combined store export
```

### Effort: Medium | Impact: Medium | Priority: P1

---

## 3. Standardize Error Handling

### Problem

Four distinct error handling patterns coexist, making it unclear how to handle failures:

1. **Result type** (`@minimal-rpg/characters`):

   ```typescript
   type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
   ```

2. **Effect-TS** (`@minimal-rpg/llm`):

   ```typescript
   Effect.Effect<LLMResponse, Error>
   ```

3. **Throw + catch** (most packages):

   ```typescript
   throw new Error('...');
   ```

4. **Log + continue** (API routes, services):

   ```typescript
   } catch (error) {
     console.error('Error:', error);
     return c.json({ error: 'Internal error' }, 500);
   }
   ```

### Solution

Establish a layered approach:

1. **Domain logic**: Use `Result<T, DomainError>` for recoverable errors
2. **LLM/async**: Continue using Effect where already adopted
3. **API boundaries**: Standardize error response shape
4. **Create typed domain errors**:

   ```typescript
   // packages/utils/src/errors/domain-errors.ts
   export class NotFoundError extends Error {
     readonly code = 'NOT_FOUND';
     constructor(resource: string, id: string) {
       super(`${resource} not found: ${id}`);
     }
   }

   export class ValidationError extends Error {
     readonly code = 'VALIDATION_ERROR';
     constructor(public readonly issues: ZodIssue[]) {
       super('Validation failed');
     }
   }
   ```

5. **Create error mapping middleware** that converts domain errors to HTTP responses

### Files to Create/Modify

- `packages/utils/src/errors/domain-errors.ts` (create)
- `packages/api/src/middleware/error-handler.ts` (enhance)
- Move `Result<T>` from characters to utils for shared use

### Effort: Medium | Impact: High | Priority: P0

---

## 4. Improve Test Coverage

### Problem

Current test-to-source ratio is 4.5% (3,333 LOC tests / 74,330 LOC source). Many critical paths lack coverage:

| Package | Test Files | Notable Gaps |
|---------|------------|--------------|
| `@minimal-rpg/services` | 0 | All domain services untested |
| `@minimal-rpg/projections` | 0 | Event reducers untested |
| `@minimal-rpg/actors` | 2 | Actor state machines partially tested |
| `@minimal-rpg/api` | 21 | Good coverage, but integration gaps |
| `@minimal-rpg/web` | 7 | Store logic and hooks minimally tested |

### Solution

Prioritized testing strategy:

**Tier 1 - Critical (require tests before changes):**

- API route handlers (request/response contracts)
- Zustand store actions
- Schema boundary validation
- Event reducers in projections

**Tier 2 - Important:**

- Service methods (physics, time, social)
- Actor state transitions
- Data transformation utilities

**Tier 3 - Nice to Have:**

- UI component snapshots
- Helper/utility functions

### Implementation

1. Add `test:coverage` script to track progress
2. Enforce coverage thresholds in CI (start at 10%, increment)
3. Require tests for new code in PR reviews
4. Block merges that reduce coverage

### Effort: High (ongoing) | Impact: High | Priority: P1

---

## 5. Address TODO/FIXME Debt

### Problem

20+ TODO comments indicate incomplete implementations scattered across the codebase:

| Location | TODO | Risk Level |
|----------|------|------------|
| `web/src/features/session-workspace/SessionWorkspace.tsx:272` | Implement auto-save to server | Medium - data loss risk |
| `web/src/features/session-workspace/steps/PlayerStep.tsx:29` | Fetch full persona profile from API | Low - works with partial data |
| `web/src/features/prefab-builder/store.ts:106,704` | Migrate to new relational structure | High - technical debt compounds |
| `api/src/services/turn-orchestrator.ts:167,179` | Replace with session-aware time service, Wire to AmbientCollector | Medium - affects game loop |
| `services/src/rules/validators.ts:21` | Define proper GameState type | Medium - validation incomplete |

### Solution

1. **Audit**: Run `grep -r "TODO\|FIXME\|HACK\|XXX" packages/ --include="*.ts" --include="*.tsx"`
2. **Categorize**: Tag each as `blocker`, `improvement`, or `future`
3. **Schedule**: Add blockers to sprint backlog, create tickets for others
4. **Prevent growth**: Add lint rule requiring issue links for new TODOs

### Effort: Varies | Impact: Medium | Priority: P2

---

## 6. Standardize Data Fetching in Web Package

### Problem

The custom `useFetchOnce` hook is used everywhere but lacks modern data-fetching features:

- No automatic background refetching
- No cache invalidation
- No request deduplication
- No optimistic updates
- Manual `retry()` required for refetch

Current pattern:

```typescript
export function useCharacters(): UseCharactersResult {
  return useFetchOnce<CharacterSummary[]>({
    fetcher: (signal) => getCharacters(signal),
    errorMessage: 'Failed to load characters',
  });
}
```

### Solution

Evaluate and adopt TanStack Query (React Query):

**Benefits:**

- Automatic caching with configurable stale time
- Background refetch on window focus
- Request deduplication
- Optimistic updates for mutations
- DevTools for debugging
- Pagination/infinite query support

**Migration path:**

1. Install `@tanstack/react-query`
2. Wrap app in `QueryClientProvider`
3. Convert hooks one at a time:

   ```typescript
   export function useCharacters() {
     return useQuery({
       queryKey: ['characters'],
       queryFn: ({ signal }) => getCharacters(signal),
     });
   }
   ```

4. Add mutations for create/update/delete operations
5. Remove `useFetchOnce` once migration complete

### Effort: Medium | Impact: Medium | Priority: P2

---

## 7. Remove Security Lint Suppressions

### Problem

Multiple `eslint-disable-next-line security/detect-object-injection` comments suppress legitimate security warnings:

| File | Count | Pattern |
|------|-------|---------|
| `schemas/src/shared/record-helpers.ts` | 6 | Uses `record[key]` bracket notation |
| `schemas/src/affinity/utils.ts` | 5 | Same pattern |
| `projections/src/reducers/npc.ts` | 1 | Same pattern |
| `generator/src/shared/random.ts` | 2 | Array index access |

The security rule flags `obj[key]` because if `key` comes from untrusted input, it could access prototype properties or be used for injection.

### Solution

Refactor to use safer patterns:

**Option A - Use Map:**

```typescript
// Before (triggers warning)
const dimensions: Record<string, number> = {};
dimensions[key] = value;  // eslint-disable-next-line...

// After (safe)
const dimensions = new Map<string, number>();
dimensions.set(key, value);
```

**Option B - Use Object.create(null):**

```typescript
// Prototype-free object, safer for dynamic keys
const dimensions: Record<string, number> = Object.create(null);
```

**Option C - Explicit validation:**

```typescript
// Before
const value = record[key];

// After
function getValidatedKey<K extends string>(record: Record<K, V>, key: string): V | undefined {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return record[key as K];
  }
  return undefined;
}
```

### Effort: Low | Impact: Medium | Priority: P1

---

## 8. Centralize Configuration/Constants

### Problem

Configuration values are scattered across packages:

| Category | Current Location | Issue |
|----------|------------------|-------|
| API URLs | `web/src/config.ts` | Hardcoded fallbacks |
| Timeouts | Throughout codebase | Magic numbers (10000, 15000, etc.) |
| Database URLs | `db/src/connection/resolve-database-url.ts` | Complex resolution logic |
| Feature flags | Don't exist | No way to toggle features |
| Rate limits | `api/src/*` | Inline constants |

### Solution

Create centralized configuration:

```typescript
// packages/config/src/index.ts (new package)
export const config = {
  api: {
    baseUrl: env('API_BASE_URL', 'http://localhost:3001'),
    timeout: {
      short: 5000,
      default: 10000,
      long: 30000,
    },
  },
  db: {
    url: resolveDbUrl(),
    pool: { min: 2, max: 10 },
  },
  llm: {
    model: env('OPENROUTER_MODEL', 'deepseek/deepseek-chat'),
    maxTokens: { fast: 256, deep: 1024, reasoning: 2048 },
  },
  features: {
    enableVectorSearch: env('ENABLE_VECTOR_SEARCH', false),
    enableKnowledgeGraph: env('ENABLE_KNOWLEDGE_GRAPH', false),
  },
} as const;
```

Or simpler: add a `config.ts` to `@minimal-rpg/utils` that other packages import.

### Effort: Low | Impact: Low | Priority: P3

---

## 9. Improve Barrel Export Consistency

### Problem

Inconsistent export patterns across packages:

| Pattern | Example | Issue |
|---------|---------|-------|
| Full re-export | `export * from './module.js'` | May expose internals |
| Selective | `export { publicFn } from './module.js'` | Requires maintenance |
| No barrel | Missing `index.ts` | Forces deep imports |
| Mixed | Some folders have barrels, siblings don't | Inconsistent DX |

### Current State

```text
packages/schemas/src/
├── affinity/
│   └── index.ts    ✓
├── character/
│   └── index.ts    ✓
├── events/
│   └── index.ts    ✓
├── shared/
│   └── NO index.ts ✗ (forces deep imports)
```

### Solution

1. **Convention**: Every folder with 2+ modules gets an `index.ts`
2. **Rule**: Export only public API, not internal helpers
3. **Tooling**: Add `no-restricted-imports` to enforce barrel usage
4. **Template**:

   ```typescript
   // Explicit public API
   export { PublicType, publicFunction } from './implementation.js';
   // Types (if separate)
   export type { SomeInterface } from './types.js';
   ```

### Effort: Low | Impact: Low | Priority: P3

---

## 10. Wire Existing But Unused Infrastructure

### Problem

Several features were built but never connected to the running system:

| Feature | Status | Location |
|---------|--------|----------|
| **pgvector similarity search** | Tables have `embedding` columns, no search queries | `db/schema`, `retrieval/` |
| **Knowledge graph** | `knowledgeNodes`, `knowledgeEdges` tables exist | `db/schema` |
| **Session projections** | `sessionProjections` table underutilized | `db/schema`, `projections/` |
| **Tiered cognition** | Types defined, not implemented | `llm/src/types.ts` |
| **Conversation summarization** | `summary` column on `studioSessions` | `db/schema` |

### Solution

Prioritize wiring over new features:

**Phase 1 - Quick wins:**

1. Wire `sessionProjections` for session state caching
2. Implement conversation summarization (use existing column)

**Phase 2 - Vector search:**

1. Generate embeddings on entity creation
2. Add similarity search endpoints
3. Wire to character/location matching

**Phase 3 - Knowledge graph:**

1. Build knowledge insertion from conversations
2. Add recall queries for NPCs
3. Wire to cognition for context injection

**Phase 4 - Tiered cognition:**

1. Implement model routing by task type
2. Add fast/deep/reasoning selection
3. Measure cost savings

### Effort: Medium | Impact: High | Priority: P2

---

## Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)

- [ ] Item 1: Consolidate duplicate types
- [ ] Item 3: Create domain error types
- [ ] Item 7: Fix security lint suppressions

### Sprint 2: Structure (Week 3-4)

- [ ] Item 2: Split large files (start with api/client.ts)
- [ ] Item 9: Add missing barrel exports
- [ ] Item 5: Audit and categorize TODOs

### Sprint 3: Quality (Week 5-6)

- [ ] Item 4: Add tests for critical paths
- [ ] Item 6: Evaluate TanStack Query adoption

### Sprint 4: Features (Week 7-8)

- [ ] Item 10: Wire session projections
- [ ] Item 10: Implement conversation summarization
- [ ] Item 8: Centralize configuration

### Ongoing

- Maintain test coverage thresholds
- Review new PRs for pattern compliance
- Increment coverage requirements quarterly

---

## Tracking

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| 1. Duplicate types | Not started | - | - |
| 2. Large files | Not started | - | - |
| 3. Error handling | Not started | - | - |
| 4. Test coverage | Not started | - | - |
| 5. TODO debt | Not started | - | - |
| 6. Data fetching | Not started | - | - |
| 7. Security suppressions | Not started | - | - |
| 8. Configuration | Not started | - | - |
| 9. Barrel exports | Not started | - | - |
| 10. Unused infrastructure | Not started | - | - |

---

*This document should be updated as items are completed. Link to PRs in the Notes column.*
