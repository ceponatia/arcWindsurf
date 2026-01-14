# TASK-015: Validation Hardening and Test Fixes

**Priority**: P0
**Phase**: 7 - Validation & Testing
**Estimate**: 60-90 minutes
**Depends On**: TASK-010, TASK-012, TASK-013, TASK-014

---

## Objective

Address the validation gaps and open items found during TASK-014 validation:

1. Add graceful error handling to LLM-backed advanced features so failures do not crash the flow.
2. Fix Character Studio deletion callback shape so parent callers can identify which character was deleted.
3. Fix the Studio NPC integration test assertions to match current seeded data.
4. Ensure tests can be executed reliably (document the intended command path).

---

## Scope

### A) Graceful Error Handling in Advanced Feature Generators

**Problem**: Several LLM-backed generators throw on LLM errors (no `try/catch`).

**Files to modify**:

- `packages/actors/src/studio-npc/vignettes.ts`
- `packages/actors/src/studio-npc/memory-excavation.ts`
- `packages/actors/src/studio-npc/first-impression.ts`
- `packages/actors/src/studio-npc/internal-monologue.ts`

**Implementation guidance**:

- Wrap `Effect.runPromise(...)` calls in `try/catch`.
- Return safe, type-correct fallback results.
- Do not log noisy stack traces unless useful; prefer a single scoped log message.
- Keep fallbacks human-readable but clearly marked (e.g., `[Unable to generate vignette]`).

Example fallback patterns (illustrative):

```ts
// VignetteGenerator.generate
return {
  dialogue: '[Unable to generate vignette]',
  inferredPatterns: {},
};
```

```ts
// MemoryExcavator.excavate
return {
  memory: '[Unable to excavate memory]',
  elements: [],
};
```

```ts
// FirstImpressionGenerator.generate
return {
  externalPerception: '[Unable to generate first impression]',
  internalReaction: '',
  inferredGap: null,
};
```

```ts
// InternalMonologueGenerator.generate
return {
  spoken: '[Unable to generate internal monologue]',
  thought: '',
  inferredTraits: [],
};
```

Notes:

- `packages/actors/src/studio-npc/emotional-range.ts` already has graceful handling; keep it consistent.

### B) Character Deletion Callback Should Include ID

**Problem**: Task 013 acceptance requires notifying the parent via `onDelete(id)`, but the current hook signature is `onDelete?: () => void`.

**Files to modify**:

- `packages/web/src/features/character-studio/hooks/useCharacterStudio.ts`
- `packages/web/src/features/character-studio/CharacterStudio.tsx`
- (Optional) `packages/web/src/features/character-studio/components/StudioHeader.tsx` (only if prop types need alignment)

**Implementation guidance**:

- Update option type to include the deleted id:

```ts
export interface UseCharacterStudioOptions {
  id?: string | null;
  onSave?: (() => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
}
```

- After successful delete, call `onDelete?.(id)`.
- Ensure the delete button still only appears for `isEditing`.

### C) Fix Studio NPC Integration Test Assertions

**Problem**: The integration test expects a value string not present in the current test profile.

**Files to modify**:

- `packages/actors/src/studio-npc/__tests__/integration.test.ts`

**Implementation guidance**:

- Update the assertion that currently checks for `knowledge` to match the value used in the test profile (currently `wisdom`), or assert on a value that is definitely present.

Example:

```ts
expect(prompt).toContain('wisdom');
```

Also consider adding one or more tests for the new error handling (section A):

- Use a mock `LLMProvider` whose `chat` returns a failing `Effect`.
- Verify the generator returns the fallback shape rather than throwing.

### D) Document the Expected Test Commands

**Problem**: The validation runner tool did not discover tests; we still need a clear path for running tests in this repo.

**Add a short section** to this task file (or a follow-up note in TASK-014) describing how to run:

```bash
CI=true pnpm test
```

and focused tests:

```bash
CI=true pnpm -C packages/actors test
CI=true pnpm -C packages/db test
```

If a different command is preferred in this repo (e.g., `pnpm turbo run test`), use that instead.

---

## Acceptance Criteria

### A) Error Handling

- [ ] `VignetteGenerator.generate()` returns a safe fallback on LLM failure
- [ ] `MemoryExcavator.excavate()` returns a safe fallback on LLM failure
- [ ] `FirstImpressionGenerator.generate()` returns a safe fallback on LLM failure
- [ ] `InternalMonologueGenerator.generate()` returns a safe fallback on LLM failure

### B) Deletion Callback

- [ ] `useCharacterStudio` option `onDelete` is typed as `(id: string) => void`
- [ ] Successful deletion calls `onDelete(deletedId)`
- [ ] Delete button behavior and loading/disabled states unchanged

### C) Tests

- [ ] `packages/actors/src/studio-npc/__tests__/integration.test.ts` assertion updated to match seeded values
- [ ] New/updated tests cover at least one generator failure path (LLM failure -> fallback)
- [ ] Tests run cleanly via the documented commands

---

## Validation

- Run unit tests for actors and db packages.
- Manually verify Character Studio delete flow still works:

```text
1) Open Character Studio in edit mode
2) Click delete
3) Confirm
4) Verify navigation/parent refresh sees the deleted id
```
