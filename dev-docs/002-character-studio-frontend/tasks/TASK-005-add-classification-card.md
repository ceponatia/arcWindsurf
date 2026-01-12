# TASK-005: Add Classification Card to IdentityPanel

**Priority**: P1
**Estimate**: 1 hour
**Phase**: 1 - Wire Personality Components
**Depends On**: TASK-003

---

## Objective

Add a classification card with race, alignment, and tier selects to the IdentityPanel.

## File to Modify

`packages/web/src/features/character-studio/components/IdentityPanel.tsx`

## Implementation

### Fields

| Field | Type | Options |
|-------|------|---------|
| Race | select | Human, Elf, Dwarf, etc. (check schemas for valid values) |
| Alignment | select | Lawful Good, Neutral, Chaotic Evil, etc. |
| Tier | select | Commoner, Notable, Elite, Legendary |

### Signal Paths

- `characterProfile.value.race`
- `characterProfile.value.alignment`
- `characterProfile.value.tier`

### Layout

```tsx
<IdentityCard title="Classification" defaultOpen={false}>
  <div className="grid grid-cols-3 gap-4">
    <div>
      <label>Race</label>
      <select value={...} onChange={...}>
        {/* options */}
      </select>
    </div>
    <div>
      <label>Alignment</label>
      <select value={...} onChange={...}>
        {/* options */}
      </select>
    </div>
    <div>
      <label>Tier</label>
      <select value={...} onChange={...}>
        {/* options */}
      </select>
    </div>
  </div>
</IdentityCard>
```

## Notes

- Check `@minimal-rpg/schemas` for valid enum values
- If schemas don't define these, use sensible defaults

## Acceptance Criteria

- [ ] Classification card appears in IdentityPanel
- [ ] All three selects render with options
- [ ] Selecting updates the signal
- [ ] Changes persist when saving character
