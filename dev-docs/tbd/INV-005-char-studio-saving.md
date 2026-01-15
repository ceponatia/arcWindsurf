# Character Studio Saving Fixes

## Summary

I am still getting errors when saving characters when some of the later components are used such as voice & communication, stress response, values, social patterns, etc. Make sure the routes for each one are correct and that the db tables are accurate.

## Investigation Findings

### Root Cause

The `useCharacterStudio.save()` function in `packages/web/src/features/character-studio/hooks/useCharacterStudio.ts` does **not transform the `personalityMap`** before sending to the API. It directly spreads `characterProfile.value` which contains raw form state that may not match schema requirements.

### Data Flow Analysis

```text
Form Components → updatePersonalityMap() → characterProfile.value.personalityMap
                                                    ↓
                                    useCharacterStudio.save()
                                                    ↓
                            Spreads raw data directly into profile
                                                    ↓
                                    API: CharacterProfileSchema.safeParse()
                                                    ↓
                                    VALIDATION FAILS ❌
```

### Specific Issues

1. **Fear entries with empty `specific` field**
   - Form allows empty `specific` string
   - Schema requires `z.string().min(1).max(200)`

2. **Values/Fears arrays with invalid entries**
   - Form may include placeholder entries
   - Schema expects valid enum values and required fields

3. **Missing transformation step**
   - `buildPersonalityMap()` in `transformers.ts` properly filters/transforms data
   - But `useCharacterStudio.save()` doesn't use it

### Comparison: Physique Handling (Working)

The save function already handles `physique` transformation:

```typescript
// physique is transformed from flat form object to string
let physiqueForApi: CharacterProfile['physique'] = current.physique;
if (current.physique && typeof current.physique === 'object') {
  // ... converts to descriptive string
}
```

### Solution

Add similar transformation for `personalityMap` using existing `buildPersonalityMap()` helper:

```typescript
import { buildPersonalityMap } from '../transformers.js';

// In save():
const personalityMapForApi = current.personalityMap
  ? buildPersonalityMap(current.personalityMap as PersonalityFormState)
  : undefined;

const profile: CharacterProfile = {
  ...current,
  personalityMap: personalityMapForApi,
  // ...
};
```

## Files to Modify

1. `packages/web/src/features/character-studio/hooks/useCharacterStudio.ts`
   - Import `buildPersonalityMap` and `PersonalityFormState`
   - Transform `personalityMap` before sending to API

## Verification

- Save character with populated speech style → Should succeed
- Save character with populated stress response → Should succeed
- Save character with values (some empty) → Should filter and succeed
- Save character with fears (empty specific) → Should filter and succeed

## Resolution (2026-01-14)

### Initial Fix Attempt (Failed)

The first fix attempted to use `buildPersonalityMap()` from `transformers.ts` to transform the data. However, this failed because:

- `buildPersonalityMap()` expects `PersonalityFormState` (form types with arrays like `dimensions: DimensionEntry[]`)
- The signal stores data in `PersonalityMap` format (schema types with records like `dimensions: Record<string, number>`)

### Correct Fix

Replaced the `buildPersonalityMap()` call with inline sanitization that works with the actual `PersonalityMap` format:

```typescript
let personalityMapForApi: PersonalityMap | undefined = current.personalityMap;
if (personalityMapForApi) {
  const sanitized: PersonalityMap = { ...personalityMapForApi };
  // Filter fears with empty specific field (schema requires min 1 char)
  if (sanitized.fears) {
    sanitized.fears = sanitized.fears.filter(f => f.specific && f.specific.trim().length > 0);
    if (sanitized.fears.length === 0) delete sanitized.fears;
  }
  // Filter values with invalid entries
  if (sanitized.values && sanitized.values.length === 0) {
    delete sanitized.values;
  }
  // Only include if there's actual data
  personalityMapForApi = Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
```

### Verified Working

All personality components tested via Playwright MCP:

| Component | Status |
|-----------|--------|
| Personality Dimensions (Big Five sliders) | ✅ Works |
| Emotional Baseline | ✅ Works |
| Values & Motivations | ✅ Works |
| Fears & Triggers | ✅ Works |
| Social Patterns | ✅ Works |
| Voice & Communication | ✅ Works |
| Stress Response | ✅ Works |

### Status: RESOLVED
