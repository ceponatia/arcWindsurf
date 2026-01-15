# INVESTIGATION 004: Classification Component Expansion

## Summary

Currently the classification component contains:
- Race: dropdown list
- Alignment: dropdown list
- Tier: dropdown list

We don't need tier as I'm not sure what that would be used for in our game.
I want to be able to easily add races to the dropdown, so tell me where that is managed in the codebase so I can edit it manually.
We need to add a few more races to the dropdown now:
- Daemon
- Merfolk
- Demigod

I'd also like to add a new dropdown between race and alignment called "Subrace" that will dynamically update based on the selected race. You may add subraces you think would be appropriate but I have a few in mind:
- Daemon subraces
  - Tiefling
  - Succubus
  - Abomination
- Human subraces
  - Half-elf (also in Elf race)
  - Half-orc (also in Orc race)
  - Half-troll (also in Troll race)
- Faerie subraces
  - Sprite
  - Pixie
  - Dryad
  - Siren (also in Merfolk race)

## Research Findings

### Race Management Location

Races are defined as a constant array in `@/packages/schemas/src/character/basics.ts`:

```typescript
export const RACES = [
  'Human', 'Elf', 'Dwarf', 'Hobbit', 'Orc', 'Half-Orc', 'Half-Troll', 'Faerie', 'Gnome',
] as const;
export type Race = (typeof RACES)[number];
```

The schema is used by:

- `CharacterBasicsSchema` in the same file (validates race field)
- `IdentityPanel.tsx` in the web package (renders the dropdown)

### UI Component Location

The Classification card is rendered in `@/packages/web/src/features/character-studio/components/IdentityPanel.tsx` (lines 159-220). It currently has a 3-column grid with Race, Alignment, and Tier dropdowns.

## Implementation Plan

### Phase 1: Schema Updates

1. **Add new races** to `RACES` array in `packages/schemas/src/character/basics.ts`:
   - Daemon
   - Merfolk
   - Demigod

2. **Create subrace definitions** with race-to-subrace mapping:
   - New `SUBRACES` constant with all subraces
   - New `RACE_SUBRACES` mapping object
   - New `Subrace` type
   - Export types and update `CharacterBasicsSchema` with optional `subrace` field

### Phase 2: Frontend Updates

1. **Update `IdentityPanel.tsx`**:
   - Import `SUBRACES` and `RACE_SUBRACES` from schemas
   - Remove Tier dropdown
   - Add Subrace dropdown between Race and Alignment
   - Make Subrace dropdown dynamically filter based on selected race
   - Clear subrace when race changes (if current subrace not valid for new race)

2. **Update grid layout** from 3-column to 2-column for Race/Subrace/Alignment

### Phase 3: Signals Update

1. **Update `signals.ts`** to handle subrace clearing when race changes

## Files to Modify

| File | Changes |
|------|---------|
| `packages/schemas/src/character/basics.ts` | Add races, subraces, mapping, schema field |
| `packages/web/src/features/character-studio/components/IdentityPanel.tsx` | Add subrace dropdown, remove tier |
| `packages/web/src/features/character-studio/signals.ts` | May need subrace-clearing logic |
