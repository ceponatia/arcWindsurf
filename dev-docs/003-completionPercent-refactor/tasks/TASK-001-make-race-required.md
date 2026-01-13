# TASK-001: Make Race Required in Schema

**Priority**: P0
**Estimate**: 15 minutes
**Phase**: 1 - Schema Changes
**Depends On**: None

---

## Objective

Update the `CharacterBasicsSchema` to make the `race` field required instead of optional, aligning it with the completion tracking requirements.

## File to Modify

`packages/schemas/src/character/basics.ts`

## Current Implementation

```typescript
race: z.enum(RACES).optional(),
```

## Target Implementation

```typescript
race: z.enum(RACES),
```

## Additional Changes

1. Update any TypeScript interfaces that depend on this schema
2. Ensure default value in `createInitialState()` is still "Human"
3. Verify no breaking changes in consumers

## Files to Check for Breaking Changes

- `packages/web/src/features/character-studio/components/IdentityPanel.tsx`
- `packages/web/src/features/character-studio/transformers.ts`
- Any API endpoints that create characters

## Acceptance Criteria

- [ ] `race` field is required in `CharacterBasicsSchema`
- [ ] `CharacterBasics` type reflects required `race`
- [ ] `createInitialState()` still defaults to "Human"
- [ ] No TypeScript errors in consuming packages
- [ ] Existing tests pass
