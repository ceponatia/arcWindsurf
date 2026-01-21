# TASK-009: Add Occupation Input to Classification Card

**Priority**: P2
**Status**: ✅ Ready for Review
**Estimate**: 45m
**Plan**: PLAN-1.0
**Depends On**: TASK-001

---

## Description

Add an occupation text input field to the Classification card in Character Studio. Occupation enables occupation-based sensory fragments and template suggestions. Uses a text input with datalist for common options while allowing custom entries.

## Technical Notes

### Component Update

```tsx
// In ClassificationCard or IdentityPanel Classification section

{
  /* After Alignment selector */
}
<div className="mt-4">
  <label className="block">
    <span className="text-xs text-slate-400">Occupation</span>
    <input
      type="text"
      value={profile.occupation ?? ''}
      onChange={(e) => updateProfile('occupation', e.target.value || undefined)}
      placeholder="e.g., blacksmith, scholar, healer..."
      list="occupation-suggestions"
      className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                 text-slate-200 placeholder-slate-500
                 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
    />
    <datalist id="occupation-suggestions">
      <option value="blacksmith" />
      <option value="sailor" />
      <option value="scholar" />
      <option value="herbalist" />
      <option value="merchant" />
      <option value="soldier" />
      <option value="noble" />
      <option value="farmer" />
      <option value="thief" />
      <option value="priest" />
      <option value="healer" />
      <option value="ranger" />
      <option value="bard" />
      <option value="alchemist" />
      <option value="hunter" />
    </datalist>
  </label>
  <p className="text-xs text-slate-500 mt-1">Occupation influences suggested sensory templates</p>
</div>;
```

### Occupation Suggestions Data

Consider extracting to a shared constant:

```typescript
// packages/schemas/src/character/occupations.ts
export const COMMON_OCCUPATIONS = [
  'blacksmith',
  'sailor',
  'scholar',
  'herbalist',
  'merchant',
  'soldier',
  'noble',
  'farmer',
  'thief',
  'priest',
  'healer',
  'ranger',
  'bard',
  'alchemist',
  'hunter',
  'cook',
  'innkeeper',
  'guard',
  'miner',
  'woodcutter',
] as const;

export type CommonOccupation = (typeof COMMON_OCCUPATIONS)[number];
```

### Signal Update

Ensure `updateProfile` handles the occupation field:

```typescript
// occupation should already work if CharacterProfileSchema includes it
updateProfile('occupation', value);
```

## Files to Modify

- `packages/web/src/features/character-studio/components/IdentityPanel.tsx` - Add input
- `packages/schemas/src/character/occupations.ts` - Create (optional, for shared list)

## Dependencies

- TASK-001 (occupation field in schema)

## Testing

### Manual Testing Checklist

1. [ ] Input appears in Classification section
2. [ ] Placeholder text shows examples
3. [ ] Datalist dropdown appears when typing
4. [ ] Custom values can be entered
5. [ ] Value persists after page refresh
6. [ ] Empty value doesn't cause errors
7. [ ] Sensory Profile card reflects occupation in suggestions

## Acceptance Criteria

- [ ] Occupation input appears in Classification card after Alignment
- [ ] Input has placeholder text with examples
- [ ] Datalist provides common occupation suggestions
- [ ] Custom text input allowed (not restricted to datalist)
- [ ] Value persists to `CharacterProfile.occupation`
- [ ] Field is optional (no validation blocking save)
- [ ] Input styling matches existing Classification card inputs
