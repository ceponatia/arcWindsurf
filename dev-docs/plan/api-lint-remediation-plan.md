# API Package Lint Remediation Plan

**Status**: Draft
**Created**: January 2026
**Target**: Reduce 714 errors + 19 warnings to 0

---

## Executive Summary

The `@minimal-rpg/api` package has accumulated **714 lint errors** and **19 warnings** across 28 files. This debt stems from:

1. **Type safety gaps** - Pervasive `as any` casts to work around UUID branded types
2. **Missing type imports** - Schema types exist but aren't imported
3. **Untyped JSON blobs** - Database state columns lack discriminated union types
4. **Code duplication** - Duplicate helper functions within files
5. **Legacy patterns** - Code predating World Bus architecture

This plan prioritizes **root cause fixes** over surface-level suppressions and identifies **legacy code for deletion**.

---

## 1. Error Distribution Analysis

### Top Offenders (by error count)

| File | Errors | Root Cause |
|------|--------|------------|
| `services/simulation-hooks.ts` | 143 | Missing type imports, `as any` state access |
| `routes/resources/locations.ts` | 80 | `as any` DB row mappings |
| `routes/game/schedules.ts` | 61 | `as any` for state access, UUID casts |
| `services/tier-service.ts` | 42 | `as any` state blobs |
| `routes/game/sessions/session-create-full.ts` | 38 | UUID casts, `as any` profile access |
| `routes/users/profiles.ts` | 36 | `profileJson as any` |
| `game/tools/handlers.ts` | 35 | `as any` state access, UUID casts |
| `routes/users/personas.ts` | 30 | `as any` state access |
| `routes/game/sessions/session-npcs.ts` | 27 | State access patterns |
| `routes/game/sessions/session-messages.ts` | 27 | State access patterns |

### Error Categories

| Rule | Count | Fix Strategy |
|------|-------|--------------|
| `@typescript-eslint/no-unsafe-assignment` | ~250 | Type state blobs |
| `@typescript-eslint/no-explicit-any` | ~200 | Add proper types |
| `@typescript-eslint/no-unsafe-member-access` | ~150 | Type discriminated unions |
| `@typescript-eslint/no-unsafe-argument` | ~80 | UUID helper functions |
| `@typescript-eslint/prefer-nullish-coalescing` | 19 | Replace `\|\|` with `??` |

---

## 2. Root Causes & Solutions

### 2.1 UUID Branded Type Mismatch

**Problem**: The `@minimal-rpg/db` package uses branded UUID types (`SessionId`, `ActorId`, etc.), but API code passes plain strings. This forces `as any` casts everywhere.

**Current Pattern** (problematic):

```typescript
const actorState = await getActorState(sessionId as any, npcId);
await upsertActorState({ sessionId: sessionId as any, ... });
```

**Solution**: Create UUID coercion utilities in API package

```typescript
// src/utils/uuid.ts
import type { SessionId, ActorId, EntityProfileId } from '@minimal-rpg/db';

export const toSessionId = (id: string): SessionId => id as SessionId;
export const toActorId = (id: string): ActorId => id as ActorId;
export const toEntityProfileId = (id: string): EntityProfileId => id as EntityProfileId;
```

**Impact**: Eliminates ~80 `no-unsafe-argument` errors with a single semantic cast location.

### 2.2 Untyped Actor State JSON

**Problem**: The `actor_states.state` column is typed as `unknown` in Drizzle, forcing `as any` for every access.

**Current Pattern** (problematic):

```typescript
const stateObj = actorState.state as any;
const tier = stateObj.tier || 'background';
const schedule = stateObj.schedule;
```

**Solution**: Create discriminated union types for actor state shapes

```typescript
// src/types/actor-state.ts
import type { NpcSchedule, PlayerInterestScore, NpcLocationState } from '@minimal-rpg/schemas';

interface NpcActorState {
  role: 'primary' | 'supporting' | 'background' | 'antagonist';
  tier: 'major' | 'minor' | 'transient' | 'background';
  name: string;
  profileJson?: string;
  location?: { currentLocationId: string };
  schedule?: NpcSchedule;
  interest?: PlayerInterestScore;
  simulation?: {
    currentState?: NpcLocationState;
    lastComputedAt?: GameTime;
    dayDecisions?: unknown;
  };
  affinity?: Record<string, AffinityRecord>;
  status: 'active' | 'inactive';
}

interface PlayerActorState {
  profile: CharacterProfile;
  status: 'active' | 'inactive';
}

type ActorState = NpcActorState | PlayerActorState;

// Type guard
function isNpcState(state: ActorState): state is NpcActorState {
  return 'tier' in state;
}
```

**Impact**: Eliminates ~300 `no-unsafe-assignment` and `no-unsafe-member-access` errors.

### 2.3 Missing Type Imports in simulation-hooks.ts

**Problem**: The file uses 15+ types from `@minimal-rpg/schemas` without importing them.

**Missing Imports**:

```typescript
import type {
  NpcTier,
  GameTime,
  DayPeriod,
  TieredSimulationConfig,
  NpcLocationState,
  LocationOccupancy,
  PresentNpc,
  CrowdLevel,
  TimeSkipSimulation,
} from '@minimal-rpg/schemas';
```

**Impact**: Fixes ~50 errors in simulation-hooks.ts alone.

### 2.4 Duplicate Helper Functions

**Problem**: `simulation-hooks.ts` contains duplicate definitions of:

- `generateOccupancyDescription()` (lines 644-670 and 698-721)
- `generateTimeSkipSummary()` (lines 675-689 and 726-740)

**Solution**: Delete the duplicate definitions (lines 694-740).

**Impact**: Fixes duplicate function errors, reduces file size.

### 2.5 profileJson as any Pattern

**Problem**: Database rows have `profileJson: unknown`, forcing casts.

**Current Pattern**:

```typescript
const profile = t.profileJson as any;
const parsed = CharacterProfileSchema.parse(profile);
```

**Solution**: The pattern is actually correct - just needs a single validated access point:

```typescript
// src/utils/profile-parser.ts
export function parseCharacterProfile(json: unknown): CharacterProfile | null {
  const result = CharacterProfileSchema.safeParse(json);
  return result.success ? result.data : null;
}
```

**Impact**: Centralizes the parse pattern, makes `as any` unnecessary.

---

## 3. Legacy Code Candidates for Deletion

Based on `status/WORLD_BUS_STATUS.md` and current architecture:

### 3.1 Files to Evaluate for Removal

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `services/simulation-hooks.ts` | 741 | **REFACTOR** | Core functionality but has duplicate code |
| `game/tools/` directory | ~400 | **EVALUATE** | Session tools may overlap with actors package |
| `loaders/` directory | ~300 | **KEEP** | Still used for filesystem data loading |

### 3.2 Deprecated Patterns to Remove

| Pattern | Location | Replacement |
|---------|----------|-------------|
| Direct DB state manipulation | Multiple services | World Bus events |
| `profileJson` direct access | profiles.ts, session-create-full.ts | Typed parsers |

### 3.3 Dead Code Detection

Run after initial fixes to identify unused exports:

```bash
npx knip --include-entry-exports
```

---

## 4. Implementation Phases

### Phase 1: Foundation (Est. 2-3 hours)

**Goal**: Create shared utilities that eliminate bulk of errors

1. **Create `src/utils/uuid.ts`** - UUID coercion helpers
2. **Create `src/types/actor-state.ts`** - Discriminated union types
3. **Create `src/utils/profile-parser.ts`** - Safe profile parsing
4. **Fix `simulation-hooks.ts` imports** - Add missing type imports
5. **Remove duplicate functions in `simulation-hooks.ts`**

**Expected Impact**: ~200 errors fixed

### Phase 2: Services Layer (Est. 2-3 hours)

**Goal**: Type the services layer properly

Files to fix:

1. `services/simulation-hooks.ts` - Apply actor state types
2. `services/tier-service.ts` - Apply actor state types
3. `services/instances.ts` - Apply profile parsers
4. `services/schedule-service.ts` - Type schedule data

**Expected Impact**: ~180 errors fixed

### Phase 3: Routes - Sessions (Est. 3-4 hours)

**Goal**: Type session-related routes

Files to fix:

1. `routes/game/sessions/session-create-full.ts`
2. `routes/game/sessions/session-npcs.ts`
3. `routes/game/sessions/session-messages.ts`
4. `routes/game/sessions/session-crud.ts`
5. `routes/game/sessions/session-overrides.ts`
6. `routes/game/sessions/shared.ts`

**Expected Impact**: ~120 errors fixed

### Phase 4: Routes - Resources & Users (Est. 2-3 hours)

**Goal**: Type resource and user routes

Files to fix:

1. `routes/resources/locations.ts`
2. `routes/resources/items.ts`
3. `routes/resources/tags.ts`
4. `routes/users/profiles.ts`
5. `routes/users/personas.ts`
6. `routes/users/workspaceDrafts.ts`

**Expected Impact**: ~150 errors fixed

### Phase 5: Game & Admin (Est. 1-2 hours)

**Goal**: Complete remaining files

Files to fix:

1. `routes/game/schedules.ts`
2. `routes/game/hygiene.ts`
3. `routes/admin/sessions.ts`
4. `game/tools/handlers.ts`
5. `routes/studio.ts`

**Expected Impact**: ~60 errors fixed

### Phase 6: Cleanup & Validation (Est. 1 hour)

1. Run full lint check - verify 0 errors
2. Run `pnpm typecheck` - verify no type errors
3. Run tests - verify no regressions
4. Run Codacy analysis - verify no new issues
5. Update `api-lint-backlog.md` and `api-linting-debt.md` as completed

---

## 5. File-by-File Fix Guide

### 5.1 `services/simulation-hooks.ts` (143 errors)

**Issues**:

- Missing imports for 15+ types
- `as any` casts for UUID parameters
- `as any` casts for state access
- Duplicate helper functions (lines 694-740)

**Fix Steps**:

1. Add imports:

   ```typescript
   import type {
     NpcTier,
     GameTime,
     DayPeriod,
     TieredSimulationConfig,
     NpcLocationState,
     LocationOccupancy,
     PresentNpc,
     CrowdLevel,
     TimeSkipSimulation,
   } from '@minimal-rpg/schemas';
   ```

2. Replace `sessionId as any` with `toSessionId(sessionId)`

3. Type the `SimulationContext` interface properly:

   ```typescript
   interface SimulationContext {
     lastComputedAt?: GameTime;
     dayDecisions?: Record<string, unknown>;
     currentState?: NpcLocationState;
   }
   ```

4. Delete duplicate helper functions (lines 694-740)

### 5.2 `routes/resources/locations.ts` (80 errors)

**Issues**:

- `row` parameter typed as `any` in mapper functions
- `as any[]` casts for nodesJson/connectionsJson

**Fix Steps**:

1. Define row type based on Drizzle schema:

   ```typescript
   interface LocationMapRow {
     id: string;
     name: string;
     description: string | null;
     settingId: string;
     nodesJson: LocationNode[] | null;
     connectionsJson: LocationConnection[] | null;
     defaultStartLocationId: string | null;
     tags: string[] | null;
     createdAt: Date;
     updatedAt: Date;
   }
   ```

2. Update mapper function signatures:

   ```typescript
   function mapRowToSummary(row: LocationMapRow): LocationMapSummary
   function mapRowToLocationMap(row: LocationMapRow): LocationMap
   ```

### 5.3 `routes/game/schedules.ts` (61 errors)

**Issues**:

- `as any` casts for state.schedule access
- UUID parameter casts

**Fix Steps**:

1. Import NpcSchedule type
2. Define typed state interface
3. Use UUID helpers
4. Type filter callback parameters

### 5.4 `services/tier-service.ts` (42 errors)

**Issues**:

- `as any` for state blob access
- UUID casts

**Fix Steps**:

1. Import `NpcActorState` type
2. Use type guards for state access
3. Use UUID helpers

---

## 6. Types to Add to `@minimal-rpg/api`

### New Files

```text
src/
├── types/
│   ├── actor-state.ts      # NpcActorState, PlayerActorState, ActorState
│   ├── db-rows.ts          # Typed interfaces for common DB row shapes
│   └── index.ts            # Re-exports
├── utils/
│   ├── uuid.ts             # UUID coercion helpers
│   ├── profile-parser.ts   # Safe profile parsing utilities
│   └── state-guards.ts     # Type guards for actor states
```

### Types to Export from schemas (if missing)

Verify these are exported from `@minimal-rpg/schemas`:

- `NpcTier`
- `GameTime`
- `DayPeriod`
- `NpcLocationState`
- `LocationOccupancy`
- `PresentNpc`
- `CrowdLevel`
- `TimeSkipSimulation`
- `TieredSimulationConfig`
- `NpcSchedule`
- `AffinityRecord`

---

## 7. Validation Checklist

After each phase, verify:

- [ ] `pnpm turbo run lint --filter @minimal-rpg/api` passes
- [ ] `pnpm turbo run typecheck --filter @minimal-rpg/api` passes
- [ ] `pnpm turbo run test --filter @minimal-rpg/api` passes
- [ ] No new Codacy issues introduced

Final validation:

- [ ] All 714 errors resolved
- [ ] All 19 warnings resolved
- [ ] No `as any` casts remain (or documented exceptions)
- [ ] Dead code removed
- [ ] `api-lint-backlog.md` archived to `plan/completed/`

---

## 8. Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Lint errors | 714 | 0 |
| Lint warnings | 19 | 0 |
| `as any` casts | ~200 | <10 (documented) |
| Type coverage | ~60% | >95% |
| Duplicate code | Present | Eliminated |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Type changes break runtime | Run full test suite after each phase |
| UUID helpers miss edge cases | Comprehensive type tests |
| Large PR size | Split into phase-based PRs |
| Discovery of more issues | Update plan as needed |

---

## 10. Appendix: Full Error List by File

```text
simulation-hooks.ts:143 errors
locations.ts:80 errors
schedules.ts:61 errors
tier-service.ts:42 errors
session-create-full.ts:38 errors
profiles.ts:36 errors
handlers.ts:35 errors
personas.ts:30 errors
session-npcs.ts:27 errors
session-messages.ts:27 errors
workspaceDrafts.ts:26 errors
instances.ts:26 errors
items.ts:22 errors
hygiene.ts:20 errors
session-crud.ts:18 errors
tags.ts:17 errors
sessions.ts:17 errors
studio.ts:13 errors
usage.ts:7 errors
sessionsClient.ts:6 errors
session-overrides.ts:6 errors
shared.ts:4 errors
session-mappers.ts:4 errors
session-effective.ts:4 errors
server-impl.ts:2 errors
list-sessions.ts:2 errors
turns.ts:1 errors
```

---

## 11. Related Documents

- [API Lint Backlog](../api-lint-backlog.md) - Prior context
- [API Linting Debt](../api-linting-debt.md) - Original debt documentation
- [World Bus Status](../status/WORLD_BUS_STATUS.md) - Current architecture
- [Character Builder Vision](./vision/v2-refactor/VIS-3.1-character-builder-refactor.md) - Future state
