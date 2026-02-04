# Generator Package Test Coverage Review

## Scope

Package: `@minimal-rpg/generator`

Focus: shared random utilities, character generation, filters, themes, pools.

## Existing Tests

- `test/random.test.ts`
  - Covers `pickRandom`, `pickWeighted`, `pickFromPool`, `pickMultiple`, `pickRandomCount`.
  - Verifies `randomInt`, `randomFloat`, `randomFloatRounded`, `randomBool`, `randomId`, `shuffle` behavior with `Math.random` stubs.
- `test/random-advanced.test.ts`
  - Covers `pickMultipleFromPool` weighted uniqueness, count overflow, and `pickRandomCountFromPool` bounds.
- `test/character.test.ts`
  - Validates `getTheme` fallback and known IDs.
  - Checks `generateCharacter` output shape, meta invariants, and `fill-empty` vs `overwrite-all` behavior.
- `test/character-advanced.test.ts`
  - Covers `fill-empty` empty string handling.
  - Verifies personality dimension bias ranges for `modern-man`.
  - Checks gender filtering with `skippedFields` for mismatched regions.
- `test/filters.test.ts`
  - Covers `getBodyRegionsForGender`, `getAppearanceRegionsForGender`, `isRegionForGender`, `isAppearanceRegionForGender`, and `filterRegionsByGender`.

## Notably Untested or Under-tested Areas

### Character Generation

- `generateCharacter` shape is covered, but most content generation branches are unverified:
  - `generateName` behavior when `lastNames` pool is absent.
  - `generateSummary` placeholder replacement with all tokens.
  - `generateBackstory` token replacement path.
  - `generatePersonalityText` string vs array path.
  - `generatePhysique` optional pools (`armBuilds`, `legBuilds`, `footSizes`, `faceFeatures`) fallbacks.
  - `generateBodyMap` flavor-region logic, `regionPopulationRate` effects, and `regionsToPopulate` override behavior.
  - `generatePersonalityMap` path for missing `dimensionBiases` and randomized defaults.
  - `generateDetails` behavior when label/value pools are missing for an area.

### Themes and Pools

- No direct tests for `BASE_THEME`, `MODERN_WOMAN_THEME`, `MODERN_MAN_THEME` consistency (pool presence and expected defaults).
- Pools and weights are not validated for structure or expected diversity; missing tests for `pools` exports integrity.

### Shared Random Utilities

- `pickMultipleFromPool` with non-weighted pools is indirectly covered, but no explicit tests for edge cases like `count=0` with weighted pools.

## Suggested Test Additions (Prioritized)

1. Character generation branch coverage
   - Tests for `generateBodyMap` population rate and flavor region inclusion/exclusion.
   - Tests for `generatePersonalityText` return type variability.
   - Tests for `generateDetails` when pools are partially missing.
2. Theme sanity checks
   - Validate that each theme defines required pools and has compatible `ageRange` and `body.general` pools.
3. Pool export integrity
   - Simple tests to ensure pool exports are arrays and non-empty for core pools used by base theme.

## Notes

- Item, persona, and location generator domains are stubs with no implementation; no tests exist yet.
