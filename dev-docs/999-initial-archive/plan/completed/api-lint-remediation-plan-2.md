# API Package Lint Remediation Plan (Phase 2)

**Status**: Draft
**Created**: January 2026
**Target**: Reduce 350 errors + 18 warnings to 0

---

## Executive Summary

After completing Waves 3.1-3.7, the `@minimal-rpg/api` package has been reduced from **714 errors + 19 warnings** to **350 errors + 18 warnings** (51% reduction). The largest offenders (`simulation-hooks.ts`, `locations.ts`, `schedules.ts`, `tier-service.ts`, `session-create-full.ts`) are now clean.

The remaining errors follow **four distinct patterns** that require targeted solutions:

1. **UUID `as any` casts** - Not yet using the `toId()` / `toSessionId()` utilities
2. **`profileJson as any`** - Database JSON columns accessed without proper typing
3. **`state as Record<string, any>`** - Actor state blobs need proper typing
4. **`prefer-nullish-coalescing`** - Using `||` instead of `??`

---

## 1. Progress Summary

### Files Fixed (No Longer Have Errors)

| File | Original Errors | Status |
|------|-----------------|--------|
| `services/simulation-hooks.ts` | 143 | ✅ Fixed |
| `routes/resources/locations.ts` | 80 | ✅ Fixed |
| `routes/game/schedules.ts` | 61 | ✅ Fixed |
| `services/tier-service.ts` | 42 | ✅ Fixed |
| `routes/game/sessions/session-create-full.ts` | 38 | ✅ Fixed |

### Files Still Requiring Fixes

| File | Errors | Warnings | Total |
|------|--------|----------|-------|
| `routes/users/profiles.ts` | 36 | 0 | 36 |
| `game/tools/handlers.ts` | 35 | 0 | 35 |
| `routes/game/hygiene.ts` | 20 | 10 | 30 |
| `routes/users/personas.ts` | 30 | 0 | 30 |
| `routes/game/sessions/session-messages.ts` | 27 | 0 | 27 |
| `routes/game/sessions/session-npcs.ts` | 27 | 0 | 27 |
| `routes/users/workspaceDrafts.ts` | 26 | 0 | 26 |
| `services/instances.ts` | 26 | 0 | 26 |
| `routes/resources/items.ts` | 22 | 0 | 22 |
| `routes/game/sessions/session-crud.ts` | 18 | 0 | 18 |
| `routes/admin/sessions.ts` | 17 | 0 | 17 |
| `routes/resources/tags.ts` | 17 | 0 | 17 |
| `routes/studio.ts` | 13 | 0 | 13 |
| `routes/system/usage.ts` | 7 | 0 | 7 |
| `db/sessionsClient.ts` | 6 | 0 | 6 |
| `routes/game/sessions/session-overrides.ts` | 6 | 0 | 6 |
| `loaders/sensory-modifiers-loader.ts` | 0 | 4 | 4 |
| `mappers/session-mappers.ts` | 4 | 0 | 4 |
| `routes/game/sessions/session-effective.ts` | 4 | 0 | 4 |
| `routes/game/sessions/shared.ts` | 4 | 0 | 4 |
| `services/encounter-service.ts` | 0 | 3 | 3 |
| `routes/game/sessions/list-sessions.ts` | 2 | 0 | 2 |
| `server-impl.ts` | 2 | 0 | 2 |
| `auth/supabase.ts` | 0 | 1 | 1 |
| `routes/game/turns.ts` | 1 | 0 | 1 |

---

## 2. Error Breakdown by Rule

| Rule | Count | Fix Strategy |
|------|-------|--------------|
| `@typescript-eslint/no-explicit-any` | 109 | Replace with proper types or `unknown` + type guards |
| `@typescript-eslint/no-unsafe-assignment` | 84 | Type state blobs and JSON columns |
| `@typescript-eslint/no-unsafe-argument` | 67 | Use `toId()` / `toSessionId()` utilities |
| `@typescript-eslint/no-unsafe-member-access` | 35 | Add type guards for state access |
| `@typescript-eslint/no-unused-vars` | 20 | Remove unused variables or prefix with `_` |
| `@typescript-eslint/prefer-nullish-coalescing` | 19 | Replace `\|\|` with `??` |
| `security/detect-object-injection` | 18 | Refactor dynamic property access |
| `@typescript-eslint/no-unsafe-call` | 16 | Type function references properly |

---

## 3. Fix Categories

### 3.1 UUID `as any` Casts (67 errors)

**Pattern**: `getEntityProfile(id as any)`, `sessionId as any`

**Solution**: Import and use existing UUID utilities:

```typescript
import { toId, toSessionId, toEntityProfileId } from '../utils/uuid.js';

// Replace: getEntityProfile(id as any)
// With:    getEntityProfile(toId(id))
```

**Files affected**: `profiles.ts`, `personas.ts`, `handlers.ts`, `hygiene.ts`, `session-*.ts`

### 3.2 `profileJson as any` Pattern (36 errors)

**Pattern**: `t.profileJson as any` when parsing DB rows

**Solution**: Cast to `unknown` first, then validate with Zod:

```typescript
// Replace:
const profile = t.profileJson as any;
const parsed = CharacterProfileSchema.parse(profile);

// With:
const parsed = CharacterProfileSchema.parse(t.profileJson);
```

**Files affected**: `profiles.ts`, `personas.ts`, `workspaceDrafts.ts`

### 3.3 `state as Record<string, any>` Pattern (35 errors)

**Pattern**: Actor state accessed as `Record<string, any>`

**Solution**: Define proper state interfaces:

```typescript
interface ActorStatePayload {
  profile?: CharacterProfile | PersonaProfile;
  name?: string;
  status?: 'active' | 'inactive';
  hygiene?: Record<string, BodyPartHygieneState>;
}

const state = actorState.state as ActorStatePayload;
```

**Files affected**: `handlers.ts`, `hygiene.ts`, `session-npcs.ts`, `session-messages.ts`

### 3.4 Unused Variables (20 errors)

**Pattern**: Imported or declared but never used

**Solution**: Remove or prefix with `_` if intentionally unused

**Files affected**: Various

### 3.5 Nullish Coalescing (19 warnings)

**Pattern**: Using `||` when `??` is safer

**Solution**: Replace `||` with `??` for nullable values

```typescript
// Replace:
const value = state.name || 'default';

// With:
const value = state.name ?? 'default';
```

**Files affected**: `hygiene.ts`, `instances.ts`, various

### 3.6 Object Injection Warnings (18 warnings)

**Pattern**: Dynamic property access like `obj[key]`

**Solution**: Use type-safe accessors or suppress with validation

**Files affected**: `encounter-service.ts`, `hygiene.ts`, `sensory-modifiers-loader.ts`

---

## 4. Implementation Strategy

### Phase 1: High-Impact Files (Est. 2-3 hours)

Target the top 4 files (128 errors):

1. `routes/users/profiles.ts` - 36 errors
2. `game/tools/handlers.ts` - 35 errors
3. `routes/game/hygiene.ts` - 30 errors/warnings
4. `routes/users/personas.ts` - 30 errors

### Phase 2: Session Routes (Est. 2-3 hours)

Target session-related files (78 errors):

1. `routes/game/sessions/session-messages.ts` - 27 errors
2. `routes/game/sessions/session-npcs.ts` - 27 errors
3. `routes/game/sessions/session-crud.ts` - 18 errors
4. `routes/game/sessions/session-overrides.ts` - 6 errors

### Phase 3: Remaining Files (Est. 2-3 hours)

Complete all other files (144 errors):

1. `routes/users/workspaceDrafts.ts` - 26 errors
2. `services/instances.ts` - 26 errors
3. `routes/resources/items.ts` - 22 errors
4. All remaining smaller files

---

## 5. Validation Checklist

After each phase, verify:

- [ ] `pnpm turbo run lint --filter @minimal-rpg/api` passes
- [ ] `pnpm turbo run typecheck --filter @minimal-rpg/api` passes
- [ ] `pnpm turbo run test --filter @minimal-rpg/api` passes

Final validation:

- [ ] All 350 errors resolved
- [ ] All 18 warnings resolved
- [ ] No `as any` casts remain (or documented exceptions)

---

## 6. Related Documents

- [API Lint Remediation Plan (Phase 1)](./api-lint-remediation-plan.md) - Prior remediation
- [Wave 3.8 Roadmap](../../waves/wave-3.8/roadmap.md) - Detailed implementation instructions
